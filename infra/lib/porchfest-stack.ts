import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

export class PorchfestStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly instance: ec2.Instance;
  public readonly eip: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- VPC (use default to avoid NAT gateway costs) ---
    this.vpc = ec2.Vpc.fromLookup(this, "Vpc", { isDefault: true });

    // --- Security Group ---
    const sg = new ec2.SecurityGroup(this, "InstanceSg", {
      vpc: this.vpc,
      description: "Porchfest EC2 security group",
      allowAllOutbound: true,
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP from anywhere");
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS from anywhere");

    // --- IAM Role for EC2 ---
    const role = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"),
      ],
    });

    // --- EC2 Instance ---
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "dnf update -y",
      "dnf install -y docker",
      "systemctl enable docker",
      "systemctl start docker",
      "usermod -aG docker ec2-user",
      // Install Docker Compose plugin (pinned version + checksum verification)
      'COMPOSE_VERSION=v2.32.4',
      'COMPOSE_CHECKSUM="0c4591cf3b1ed039adcd803dbbeddf757375fc08c11245b0154135f838495a2f"',
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      'curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-aarch64" -o /usr/local/lib/docker/cli-plugins/docker-compose',
      'echo "${COMPOSE_CHECKSUM}  /usr/local/lib/docker/cli-plugins/docker-compose" | sha256sum -c -',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose',
      // Create app directory
      "mkdir -p /opt/porchfest",
      "chown ec2-user:ec2-user /opt/porchfest",
    );

    // --- SSH Key Pair (private key stored in SSM Parameter Store) ---
    const keyPair = new ec2.KeyPair(this, "KeyPair", {
      keyPairName: "porchfest-key",
      type: ec2.KeyPairType.ED25519,
    });

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

    // --- ECR Repositories ---
    new ecr.Repository(this, "ApiRepo", {
      repositoryName: "porchfest-api",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 5, description: "Keep last 5 images" }],
    });

    new ecr.Repository(this, "FrontendRepo", {
      repositoryName: "porchfest-frontend",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 5, description: "Keep last 5 images" }],
    });

    // --- SSM Parameters (placeholder values — set manually after deploy) ---
    new ssm.StringParameter(this, "DatabaseUrl", {
      parameterName: "/porchfest/database-url",
      stringValue: "PLACEHOLDER_SET_AFTER_NEON_SETUP",
      description: "Neon PostgreSQL connection string",
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, "JwtSecret", {
      parameterName: "/porchfest/jwt-secret",
      stringValue: "PLACEHOLDER_CHANGE_ME",
      description: "JWT signing secret",
      tier: ssm.ParameterTier.STANDARD,
    });

    new ssm.StringParameter(this, "FrontendUrl", {
      parameterName: "/porchfest/frontend-url",
      stringValue: "PLACEHOLDER_SET_AFTER_CLOUDFRONT",
      description: "Frontend URL for CORS",
      tier: ssm.ParameterTier.STANDARD,
    });

    // --- CloudFront Distribution ---
    // CloudFront requires a domain name, not an IP. Use sslip.io to map
    // {ip}.sslip.io -> the Elastic IP address without needing a custom domain.
    const originDomain = `${this.eip.attrPublicIp}.sslip.io`;
    const origin = new origins.HttpOrigin(originDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
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

    // --- Outputs ---
    new cdk.CfnOutput(this, "InstancePublicIp", {
      value: this.eip.attrPublicIp,
      description: "EC2 Elastic IP address",
    });

    new cdk.CfnOutput(this, "InstanceId", {
      value: this.instance.instanceId,
      description: "EC2 Instance ID",
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
      description: "CloudFront distribution ID (for cache invalidation)",
    });

    new cdk.CfnOutput(this, "SshKeyParameterName", {
      value: `/ec2/keypair/${keyPair.keyPairId}`,
      description: "SSM parameter path for the SSH private key",
    });
  }
}
