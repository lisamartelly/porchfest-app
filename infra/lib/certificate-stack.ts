import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

const DOMAIN_NAME = "porchfestpal.com";

export class CertificateStack extends cdk.Stack {
  public readonly certificate: acm.ICertificate;
  public readonly hostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: DOMAIN_NAME,
    });

    this.certificate = new acm.Certificate(this, "SiteCert", {
      domainName: DOMAIN_NAME,
      subjectAlternativeNames: [`www.${DOMAIN_NAME}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });
  }
}
