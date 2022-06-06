# aws-h4b-aws-step-functions-beginner

このリポジトリは、参考にあるハンズオン資料をもとにAWS CDK（TypeScript）で生成してみることをやってみたものです。
なお、個人のAWS CDK学習用なのでソースコードはまずは動くものを作成を心がけています。

## 参考

[AWS Hands-on for Beginners - AWS Step Functions 入門 - ビジュアルツールを使ってローコードにワークフローを作成する](https://pages.awscloud.com/JAPAN-event-OE-Hands-on-for-Beginners-StepFunctions-2022-reg-event.html?trk=aws_introduction_page)

## Prepare

```
cd ${work-dir}
git clone https://github.com/midnight480/aws-h4b-aws-step-functions-beginner.git
cd aws-h4b-aws-step-functions-beginner 
mkdir src && cd src
```

## AWS CDK

```
>cdk --version
2.26.0 (build a409d63)
> cdk init app --language=typescript
```
