## Email to PDF Proof of Concept

Problem: I was tasked with building a proof of concept for an application that would turn an email into a PDF.

## Assumptions:

* Using the Context.IO API somehow to easily parse emails: We want leverage the Context.IO API to get messages easily via webhooks.
 * The advantage: Context.IO can return message bodies as HTML by default. We can easily take the HTML and convert it to PDF.
* Using AWS Lambda to process the PDF and send a link to download
 * Why Lambda? It's easier to execute for a proof of concept, you don't have to worry about deployments, it's easily testable

 ## Steps

 1. Set-up an API key with Context.IO
 2. Add a mailbox where users would forward emails that they want to turn into PDFs to
 3. Set-up a webhook to listen for incoming messages (assuming these are the messages users want to turn into a PDF)
 4. Process webhook callback via an AWS API Gatway endpoint
 5. API Gatway endpoint directs the data to AWS Lamda for processing
 6. AWS Lamda processes webhook callback data, parses HTML body, turns it into a PDF, sends to SQS
 7. Message is in SQS waiting to be sent back to user
  - **Why do we want to send it to SQS at this point?** Because Lambdas cannot exceed a 2 minute max execution time, so I thought it best to split up the process at this point.
 8. AWS Lambda script polls SQS every 60 seconds for new messages and processes them, sends email to end-user with secure link to downlad the file through Amazon SES. 
  - The link to the file is pre-signed, so it is only good for that file and it expires after 24 hours.

## Known issues

* Gmail inserts a page break into forwarded messages, so Gmail forwards add an extra blank page to the PDF

## Challenges

* Having to upload Node.JS depedencies and binaries to Lamda

## Kudos

This script was heavily modified from [this AWS Lamda script](https://github.com/pgqueme/aws-lambda-html-pdf)
