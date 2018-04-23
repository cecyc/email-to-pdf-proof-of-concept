
const pdf = require('html-pdf')
const AWS = require('aws-sdk')

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT']

const options = { format: 'Letter', phantomPath: './phantomjs_lambda/phantomjs_linux-x86_64' }
const S3config = { bucketName: process.env['BUCKET_NAME'] }
const queueURL = process.env['QUEUE_URL']
const dayInSeconds = 86400

const getSqsBody = (recipient, subject, url) => {
    return {
        Recipient: recipient,
        Subject: subject,
        PDFUrl: url
    }
}

exports.handler = (event, context, callback) => {
  //Values from CIO webhook
  const htmlString = event["message_data"]["bodies"][0]["content"]
  const recipient = event["message_data"]["addresses"]["from"]["email"]
  const timestamp = event["timestamp"]
  const subject = event["message_data"]["subject"]
  //File names need to be unique, but also handle that subject so it purrty
  const splitSubject = subject.split(" ")
  const joinedSubject = splitSubject.join("-")
  const fileName = timestamp + "-" + recipient + "-" + joinedSubject

  //Create the PDF file from email body content
  pdf.create(htmlString, options).toBuffer((err, buffer) => {
      if (err){
        const error = new Error("There was an error generating the PDF file")
        context.done(null, "error generating PDF")
      }
      //Put in S3
      else {
        const s3 = new AWS.S3()
        const objParams = {
            Bucket : S3config.bucketName,
            Key : fileName + '.pdf',
            Body : buffer
        }

        s3.putObject(objParams, (err, data) => {
            if (err) {
                context.done(null, "error uploading to S3")
            }
        })

        const signedParams = {
            Bucket : S3config.bucketName,
            Key : fileName + '.pdf'
        }

        s3.getSignedUrl('getObject', signedParams, (err, url) => { 
            if (err) {
                context.done(null, err)
            } else {
                const body = getSqsBody(recipient, subject, url)
                const sqsMessage = {
                    MessageBody: JSON.stringify(body),
                    QueueUrl: queueURL
                }
                const sqs = new AWS.SQS({region : 'us-east-1'})
                sqs.sendMessage(sqsMessage, (err, data) => {
                    if (err) {
                        context.done(null, err)
                    } else {
                        context.done(null, `success: ${url}`)
                    }
                })
            }
        })
      }
  })
}