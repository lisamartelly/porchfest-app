import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import { Construct } from "constructs";

const DOMAIN_NAME = "porchfestpal.com";

interface PorchfestStackProps extends cdk.StackProps {
  certificate: acm.ICertificate;
}

export class PorchfestStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly instance: ec2.Instance;
  public readonly eip: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props: PorchfestStackProps) {
    super(scope, id, props);

    // --- VPC (use default to avoid NAT gateway costs) ---
    this.vpc = ec2.Vpc.fromLookup(this, "Vpc", { isDefault: true });

    // --- Security Group ---
    const sg = new ec2.SecurityGroup(this, "InstanceSg", {
      vpc: this.vpc,
      description: "Porchfest EC2 security group",
      allowAllOutbound: true,
    });

    // Restrict inbound to CloudFront only using AWS-managed prefix list
    const cfPrefixList = ec2.PrefixList.fromLookup(this, "CloudFrontPrefixList", {
      prefixListName: "com.amazonaws.global.cloudfront.origin-facing",
    });
    sg.addIngressRule(
      ec2.Peer.prefixList(cfPrefixList.prefixListId),
      ec2.Port.tcp(80),
      "HTTP from CloudFront"
    );

    // SSH access (restricted to your IP — update as needed)
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      "SSH access"
    );

    // --- IAM Role for EC2 ---
    const role = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });

    // Allow reading SecureString SSM parameters under /porchfest/*
    role.addToPolicy(new iam.PolicyStatement({
      actions: ["ssm:GetParameter", "ssm:GetParameters"],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/porchfest/*`,
      ],
    }));

    // --- S3 Bucket for band photos ---
    const photoBucket = new s3.Bucket(this, "BandPhotoBucket", {
      bucketName: "porchfest-band-photos-prod",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: [`https://${DOMAIN_NAME}`],
          maxAge: 3600,
        },
      ],
    });

    photoBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [photoBucket.arnForObjects("bands/*")],
        principals: [new iam.StarPrincipal()],
      })
    );

    photoBucket.grantReadWrite(role);

    // --- Key Pair (import an existing key pair by name) ---
    const keyPair = ec2.KeyPair.fromKeyPairAttributes(this, "KeyPair", {
      keyPairName: "porchfest-ec2",
      type: ec2.KeyPairType.ED25519,
    });

    // --- EC2 Instance ---
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "dnf update -y",

      // Install Node.js 22 via NodeSource
      'curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -',
      "dnf install -y nodejs nginx",
      "npm install -g pnpm@10",

      // Enable and start nginx
      "systemctl enable nginx",

      // Create app directories
      "mkdir -p /opt/porchfest/backend",
      "mkdir -p /opt/porchfest/frontend",
      "chown -R ec2-user:ec2-user /opt/porchfest",

      // Write nginx config
      `cat > /etc/nginx/conf.d/porchfest.conf << 'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;
    root /opt/porchfest/frontend;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINXEOF`,
      // Overwrite default nginx.conf with a clean version (no default server block)
      `cat > /etc/nginx/nginx.conf << 'NGINXMAIN'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    include /etc/nginx/conf.d/*.conf;
}
NGINXMAIN`,
      "rm -f /etc/nginx/conf.d/default.conf",
      "systemctl start nginx",

      // Write systemd service for the backend
      `cat > /etc/systemd/system/porchfest-api.service << 'SERVICEEOF'
[Unit]
Description=Porchfest API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/porchfest/backend
EnvironmentFile=/opt/porchfest/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICEEOF`,
      "systemctl daemon-reload",
      "systemctl enable porchfest-api",

      // Write server-side deploy helper (called after rsync)
      `cat > /opt/porchfest/activate.sh << 'SCRIPTEOF'
#!/bin/bash
set -euo pipefail
REGION=${this.region}

# Fetch secrets from SSM and write .env
DATABASE_URL=$(aws ssm get-parameter --name /porchfest/database-url --with-decryption --query Parameter.Value --output text --region $REGION)
JWT_SECRET=$(aws ssm get-parameter --name /porchfest/jwt-secret --with-decryption --query Parameter.Value --output text --region $REGION)
FRONTEND_URL=$(aws ssm get-parameter --name /porchfest/frontend-url --query Parameter.Value --output text --region $REGION)
S3_BUCKET_NAME=$(aws ssm get-parameter --name /porchfest/s3-bucket-name --query Parameter.Value --output text --region $REGION)
RESEND_API_KEY=$(aws ssm get-parameter --name /porchfest/resend-api-key --with-decryption --query Parameter.Value --output text --region $REGION)
FROM_EMAIL=$(aws ssm get-parameter --name /porchfest/from-email --query Parameter.Value --output text --region $REGION)

cat > /opt/porchfest/backend/.env << ENVEOF
NODE_ENV=production
PORT=8080
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
FRONTEND_URL=$FRONTEND_URL
AWS_REGION=$REGION
S3_BUCKET_NAME=$S3_BUCKET_NAME
RESEND_API_KEY=$RESEND_API_KEY
FROM_EMAIL=$FROM_EMAIL
ENVEOF
chmod 600 /opt/porchfest/backend/.env

# Install production dependencies
cd /opt/porchfest/backend
pnpm install --frozen-lockfile --prod

# Run database migrations
DATABASE_URL=$DATABASE_URL pnpm node-pg-migrate up

# Restart services
sudo systemctl restart porchfest-api
sudo systemctl restart nginx
SCRIPTEOF`,
      "chmod +x /opt/porchfest/activate.sh",
    );

    this.instance = new ec2.Instance(this, "Server", {
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: sg,
      role,
      userData,
      keyPair,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });

    // --- Elastic IP ---
    this.eip = new ec2.CfnEIP(this, "Eip");
    new ec2.CfnEIPAssociation(this, "EipAssoc", {
      allocationId: this.eip.attrAllocationId,
      instanceId: this.instance.instanceId,
    });

    // --- CloudFront Distribution ---
    const originDomain = `${this.eip.attrPublicIp}.sslip.io`;
    const origin = new origins.HttpOrigin(originDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      domainNames: [DOMAIN_NAME, `www.${DOMAIN_NAME}`],
      certificate: props.certificate,
      defaultBehavior: {
        origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      additionalBehaviors: {
        "/api/*": {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        "/health": {
          origin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // --- Route 53 DNS Records ---
    const hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: DOMAIN_NAME,
    });

    new route53.ARecord(this, "SiteAlias", {
      zone: hostedZone,
      recordName: DOMAIN_NAME,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });

    new route53.ARecord(this, "WwwAlias", {
      zone: hostedZone,
      recordName: `www.${DOMAIN_NAME}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
    });

    // --- SSM Parameters ---
    // Secrets are created manually as SecureString to avoid plaintext in CloudFormation:
    //   aws ssm put-parameter --name /porchfest/database-url --type SecureString --value "<value>"
    //   aws ssm put-parameter --name /porchfest/jwt-secret --type SecureString --value "<value>"
    //   aws ssm put-parameter --name /porchfest/resend-api-key --type SecureString --value "<value>"
    //   aws ssm put-parameter --name /porchfest/from-email --type String --value "<value>"

    new ssm.StringParameter(this, "FrontendUrl", {
      parameterName: "/porchfest/frontend-url",
      stringValue: `https://${DOMAIN_NAME}`,
      description: "Frontend URL for CORS",
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, "S3BucketName", {
      parameterName: "/porchfest/s3-bucket-name",
      stringValue: photoBucket.bucketName,
      description: "S3 bucket for band photo uploads",
      tier: ssm.ParameterTier.STANDARD,
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, "InstancePublicIp", {
      value: this.eip.attrPublicIp,
      description: "EC2 Elastic IP address",
    });

    new cdk.CfnOutput(this, "InstanceId", {
      value: this.instance.instanceId,
      description: "EC2 Instance ID",
    });

    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${DOMAIN_NAME}`,
      description: "Site URL",
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID (for cache invalidation)",
    });
  }
}
