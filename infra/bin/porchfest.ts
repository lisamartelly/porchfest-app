#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CertificateStack } from "../lib/certificate-stack";
import { PorchfestStack } from "../lib/porchfest-stack";

const app = new cdk.App();

const certStack = new CertificateStack(app, "PorchfestCert", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  crossRegionReferences: true,
});

new PorchfestStack(app, "Porchfest", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-2",
  },
  crossRegionReferences: true,
  certificate: certStack.certificate,
});
