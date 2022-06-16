import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Choice, Condition, Fail, Parallel, Pass, StateMachine, Wait, WaitTime } from 'aws-cdk-lib/aws-stepfunctions';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

import { S3 } from './resource/s3'
import { Ddb } from './resource/ddb'
import { Translate } from './resource/translatetext'
import { Polly } from './resource/polly'

export class SrcStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

  /*--- S3 Task --*/

  // S3 Bucket Name
  const s3BucketName = 'h4b-sfn-shibao';
  // S3 Bucket
  const s3bucket = new S3();
  s3bucket.createS3(this, s3BucketName);

  /*-- DynamoDB Tasks --*/

  // DynamoDB Table Name
  const ddbTableName = 'Article';
  const ddbPartitionName = 'ArticleID';
  // DynamoDB
  const ddb = new Ddb();
  ddb.createDdb(this, ddbTableName, ddbPartitionName);
  // Get DynamoDB Item for Step Functions
  const getDdbItem = ddb.getDdbItem(this);
  // Update DynamoDB for Step Functions
  const updateDdbItemTranslateText = ddb.updateDdbItemTranslateText(this);
  // Update DynamoDB for Translate Text on Step Functions
  const updateDdbItemPollyUrl = ddb.updateDdbItemPollyUrl(this);

  /*-- Translate Text Tasks --*/

  // Translate Text
  const translateText = new Translate() ;
  const calltranslateTextService = translateText.translateTextService(this);

  /*-- Polly Tasks --*/

  const polly = new Polly();
  // Speech-To-Text 
  const speechSynthesis = polly.pollyTextService(this, s3BucketName);
  // Get Speech Task State
  const getSpeechTask = polly.getPollyTaskService(this);

  /*-- Step Functions Tasks --*/

  // Wait Task
  const wait4task = new Wait(this, 'Wait for Speech Synthesis', {
    time: WaitTime.duration(Duration.seconds(5)),
  });

  // Error for Step Functions 
  const jobFailed = new Fail(this, 'Job Failed', {
    cause: 'AWS Step Functions Job Failed',
    error: 'DescribeJob returned FAILED',
  });

  /*-- Translate Tasks -- */

  const translateTasks = calltranslateTextService
    .next(updateDdbItemTranslateText)
  ;

  /*-- Polly Tasks -- */

  const callPollyTask =  speechSynthesis
    .next(getSpeechTask)
  ;

  const wait4Polly = wait4task
    .next(getSpeechTask)
  ;

  const nextPollyTask = callPollyTask
    .next( new Choice(this, 'Check for Speech Synthesis')
      .when(Condition.stringMatches('$.Result.SynthesisTask.TaskStatus', 'completed'), updateDdbItemPollyUrl)
      .otherwise( wait4Polly )
  );

  // Speech Tasks
  const speechTasks = nextPollyTask;

  // Parallel for Step Functions 
  const parallel = new Parallel(this, 'Parallel')
    .branch( translateTasks )
    .branch( speechTasks )
  ;
  
  // Definition for Step Functions
  const definition = getDdbItem
    .next( new Choice(this, 'Item is present')
        .when(Condition.isPresent('$.Item'), parallel)
        .otherwise(jobFailed)
    );

  // Step Functions
  const simpleStateMachine  =  new StateMachine(this, 'h4b-stateMachine', {
      definition: definition ,
      timeout: Duration.seconds(60)
    });

  // Add IAM Policy for Polly 
    simpleStateMachine.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:PutObject'],
        resources: ['*'],
      })
    );

  new CfnOutput(this, 'S3 Bucket Arn', { value: s3bucket.bucket.bucketArn}) ;
  new CfnOutput(this, 'DynamoDB Arn', { value: ddb.table.tableArn }) ;
  new CfnOutput(this, 'Step Functions State Machine Arn', { value: simpleStateMachine.stateMachineArn  }) ;
  new CfnOutput(this, 'Step Functions State Machine IAM Role Arn', { value: simpleStateMachine.role.roleArn  }) ;

  }
}
