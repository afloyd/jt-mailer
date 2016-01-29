jt-mailer
=========
JT (Juiced Template) Mailer. Uses Jade, LESS, Juice and nodemailer to create easily maintainable email templates

`.init(opts)`: 
```
{
    sendEmail: true, // whether or not to actually send email
    logHtml: true, // whether or not to log the email contents to the console
    mailTo: null, // send all API emails to this address (for dev/testing), if null sends to address specified in individual request
    templatesPath: 'services/email/templates', // path to jade templates folder
    stylesPath: 'services/email/styles', // path to styles folder
    onlyLogErrors: true, // Don't output .debug & .log messages from jt-mailer 
    defaultOpts: {
        from: 'foo@bar.com', // default from email for all emails generated
        to: 'hey@you.com', // default to email for all emails generated (probably not useful in most cases)
        subject: 'Test email', // default subject for all emails 
        juice: {
            // any juice options to pass to juice during each email rendering, see https://github.com/Automattic/juice
        },
        template: {
            name: 'welcome', // default email template (jade file) name (without extension)
            locals: { // Any default local variables to pass to all jade templates
                // appName: 'My App'            
            }
        }
    }
}
```


`.sendMail(opts)`:
```
{
    to: 'hey@you.com', // email address to send email to
    subject: 'Check this out!', // email subject
    juice: {}, // any configuration options to pass to juice on a per-email basis
    template: { // email template options
        name: templateName,
        locals: {
            firstName: user.first,
            lastName: user.last,
            organizationName: organizationName,
            surveyUrl: app.get('config').webSurveyUrl +
                '?email=' + user.email + '&first=' + user.first + '&last=' + user.last,
            intendedFor: user.email,
            beaconUrl: analyticsService.beaconEventUrl('emails', 'opened', templateName, null, user)
        }
    }
}
```
