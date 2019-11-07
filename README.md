# ACME Lambda

Serverless lambda service to provision and provide certificates provided
through Let's Encrypt for your domains controlled in AWS Route53.

## Explaination

### Problem

If you're anything like me, you have a handful of projects deployed over
several PaaS and IaaS providers. Each of these projects are accessible
on different domains/sub-domains and each are responsible for handling
their own SSL certificates (likely through Let's Encrypt).

Every time you start something new, you have to set up your nginx or
apache config to support renewing your SSL certificate and make sure
your crontab config is valid and runs. Not only that, but wildcard
certificates require DNS validation, which means each project you setup
you need to configure DNS API access, greatly increasing your exposure
in the case of a compromised server.

### Solution

Enter ACME Lambda, a centrally controlled and renewed certificate store.

ACME Lambda will maintain valid certificates based on your
configuration, and will allow you to provision individual API keys for
each of your servers, with key-based CIDR and certificate restrictions.

Launching a new project no longer requires configuring Let's Encrypt.
Instead, just update your ACME Lambda config file to include your new
domain/sub-domain and provision a key for your server.

## Setup

1. Clone this repo
2. Copy `./src/config.example.json` to `./src/config.json` and replace
the values with your own configuration.
3. Run `yarn`
4. Run `yarn deploy:prod`

Note: `dnsNames` must all belong to a single hosted zone.

Note: The first time you deploy a new certificate config, you should
manually execute the `certificateProvisioning` lambda to create your
certificates.

## Deployment

1. In your AWS account, navigate to your `buildApiKey` lambda
2. Create a test event with the following structure:
    ```json
    {
      "name": "my-key-name",
      "enabledCerts": [
        "com.example+wildcard",
        "com.example.foo+com.example.bar+com.example.baz"
      ],
      "cidr": "10.20.0.0/16"
    }
    ```
3. Run the function
4. Find your key in [API Gateway's API Keys](https://console.aws.amazon.com/apigateway/home?region=us-east-1#/api-keys)
5. Copy `./extra/download.example.sh` to your server
6. Make sure you have `jq` installed on your server
7. Replace the at the top of the file:
    - `API_KEY`: The value of the key you generated
    - `CERT_NAME`: The name of the certificate as listed in 
      `config.json`
    - `BASE_URL`: The URL generated from Serverless, in the output it's 
      called `ServiceEndpoint` and looks like `https://xxx.execute-api.us-east-1.amazonaws.com/prod`
    - `CERT_DIR`: The location on your server to install the certificate
8. Run `download.sh` to ensure everything is working and pull down 
   latest certificate
9. Make a crontab line to run the script once a week:
    - i.e. `0 0 * * 1 /path/to/download.sh`

## Common Actions

### Generating a new API Key

1. Edit the test event as created in step 2 of *Deployment* with your 
   new API Key details
2. Follow steps 3 and 4 of *Deployment*

### Revoking an API key

1. Find the API Key you want to revoke in API Gateway's API Keys
2. Delete the key

### Rotating a certificate

This will usually happen automatically when a certificate gets within 30
days of expiry, but if you want to do it manually you can.

1. Find your `acme-lambda-storage-xxxxx` bucket in your AWS Account
2. In the `certs-prod` folder, delete the JSON file which matches the
   certificate you want to rotate
3. If you don't want to wait for the certificate to be provisioned and 
   downloaded automatically when the lambda and cronjob are run, you can:
   1. Run the `certificateProvisioning` lambda manually
   2. On each of your servers which consume that certificate manually
      run `download.sh`

## Contributing

Feel free to open a Pull Request, I'm more than happy to accept changes
to this repo.

### Development Environment Setup

There are some strict limitations on the number of calls you can make to
Let's Encrypt in production. If you want to test out some changes, you
can deploy ACME Lambda to your AWS Account in development mode (pointing
to Let's Encrypt staging) by running `yarn deploy` instead of
`yarn deploy:prod`.
 
