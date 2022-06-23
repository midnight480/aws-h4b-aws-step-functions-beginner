import { Construct } from 'constructs';
import { CallAwsService }  from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class Polly{
    public doPollyText: CallAwsService;
    public getPollyTask: CallAwsService;

    constructor() { };

        // Text-To-Speech 
        public pollyTextService(scope: Construct, s3BucketName: string) {
            this.doPollyText = new CallAwsService(scope, 'SpeechSynthesis', {
                service: 'polly' ,
                action: 'startSpeechSynthesisTask' ,
                // iamAction: 'polly:startSpeechSynthesisTask' ,
                iamResources: ['*'] ,
                parameters: {
                    "OutputFormat": "mp3",
                    "OutputS3BucketName": s3BucketName,
                    "Text.$": "$.Item.Detail.S",
                    "VoiceId": "Mizuki"
                },
                    resultPath: '$.Result' ,
                })
            return this.doPollyText;
        }

        // Get Speech Task State
        public getPollyTaskService(scope: Construct) {
            this.getPollyTask = new CallAwsService(scope, 'GetSpeechSynthesisTask', {
                service: 'polly' ,
                action: 'getSpeechSynthesisTask' ,
                iamResources: ['*'] ,
                parameters: {
                    "TaskId.$": "$.Result.SynthesisTask.TaskId"
                } ,
                resultPath: '$.Result' ,
            });
            return this.getPollyTask;
        }
    }