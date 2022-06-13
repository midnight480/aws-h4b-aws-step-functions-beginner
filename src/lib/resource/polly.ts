import { Construct } from 'constructs';
import { CallAwsService }  from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class Polly{
    public pollyText: CallAwsService;
    public getPollyTask: CallAwsService;

    constructor() { };

        // Speech-To-Text 
        public pollyTextService(scope: Construct, id: string) {
            this.pollyText = new CallAwsService(scope, 'SpeechSynthesis', {
                service: 'polly' ,
                action: 'startSpeechSynthesisTask' ,
                // iamAction: 'polly:startSpeechSynthesisTask' ,
                iamResources: ['*'] ,
                parameters: {
                    "OutputFormat": "mp3",
                    "OutputS3BucketName": id,
                    "Text.$": "$.Item.Detail.S",
                    "VoiceId": "Mizuki"
                },
                    resultPath: '$.Result' ,
                })
            return this.pollyText;
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