#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { PorchfestStack } from "../lib/porchfest-stack";

const app = new cdk.App();

new PorchfestStack(app, "Porchfest", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});
