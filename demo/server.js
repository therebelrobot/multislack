var express = require('express')
var bodyParser = require('body-parser')
var logger = require('morgan')
var errorHandler = require('errorhandler')
var dotenv = require('dotenv')

var multislack = require('../multislack')


if(!process.env.TESTING_TEAM_DOMAIN1){
  dotenv.load({ path: '.env' })
}

var app = express()
app.set('port', process.env.PORT || 9988)
app.use(logger(process.env.ENVIRONMENT || 'dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.post('/', multislack({
  teams:[
    {
      team_domain: process.env.TESTING_TEAM_DOMAIN1,
      outgoing_token:process.env.TESTING_TEAM_OUTGOING1,
      incoming_url:process.env.TESTING_TEAM_INCOMING1,
      auth_token:process.env.TESTING_TEAM_AUTH1
    },
    {
      team_domain: process.env.TESTING_TEAM_DOMAIN2,
      outgoing_token:process.env.TESTING_TEAM_OUTGOING2,
      incoming_url:process.env.TESTING_TEAM_INCOMING2,
      auth_token:process.env.TESTING_TEAM_AUTH2
    }
  ],
  bot:{
    fetchUserInfo:true,
    icon_url:false,
    icon_emoji:false,
    username:false
  }
}))
app.use(errorHandler())
app.listen(app.get('port'), function () {
  console.warn('MultiSlack Webhooks listening on port %d in %s mode', app.get('port'), app.get('env'))
})
