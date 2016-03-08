var multislack = require('../multislack')

var dotenv = require('dotenv')

if(!process.env.TESTING_TEAM_DOMAIN1){
  dotenv.load({ path: '.env' })
}

var app = multislack({
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
}, function(){
  console.log('multislack demo running')
})
