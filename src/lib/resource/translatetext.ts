import { Construct } from 'constructs';
import { CallAwsService }  from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class Translate{
    public translateText: CallAwsService;

    constructor() { };

        public translateTextService(scope: Construct) {
            this.translateText = new CallAwsService(scope, 'TranslateText', {
                service: 'Translate' ,
                action: 'translateText' ,
                iamResources: ['*'] ,
                parameters: {
                    "SourceLanguageCode": "ja" ,
                    "TargetLanguageCode": "en",
                    "Text.$": "$.Item.Detail.S"
                } ,
                resultPath: '$.Result' ,
            });
            return this.translateText;
        }
}