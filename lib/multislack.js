'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const logger = require('morgan')
const errorHandler = require('errorhandler')
const _ = require('lodash')
const request = require('request')

const MultiSlack = function(props, cb){
  let app = express()
  app.set('port', props.port || process.env.PORT || 9988)
  app.use(logger(props.env || 'dev'))
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.post('/', webhookCtrl.bind({props:props}))
  app.use(errorHandler())
  app.listen(app.get('port'), function () {
    console.warn('MultiSlack Webhooks listening on port %d in %s mode', app.get('port'), app.get('env'))
    if(cb && typeof cb === 'function'){
      cb()
    }
  })
  return app
}

module.exports = MultiSlack

function webhookCtrl (req, res, next){
  let props = this.props
  let payload = req.body
  if(payload.bot_id){
    return res.status(200).json({})
  }
  let thisSender = _.filter(props.teams, {team_domain: payload.team_domain})
  if(!thisSender.length){
    return res.status(403).json({text:"Team not authorized for multislacking."})
  }
  thisSender = thisSender[0]
  // check outgoing token


  let recievers = _.reject(props.teams, thisSender)
  let recieverCalls = []
  recievers.forEach((reciever)=>{
    recieverCalls.push(callReciever(reciever, payload, thisSender, props))
  })
  Promise.all(recieverCalls).then(function(){
    res.status(200).json({})
  })
}
function callReciever(reciever, payload, thisSender, props){
  return new Promise(function(resolve, reject){
    var form = {}
    form.text = payload.text
    if(props.bot.icon_url){
      form.icon_url = props.bot.icon_url
    }
    if(props.bot.icon_emoji){
      form.icon_emoji = props.bot.icon_emoji
    }
    if(props.bot.username){
      form.username = props.bot.username
    }
    if(props.bot.fetchUserInfo){
      var fetchUrl = 'https://slack.com/api/users.info?token='
      fetchUrl += thisSender.auth_token
      fetchUrl += '&user='
      fetchUrl += payload.user_id
      fetchUrl += '&pretty=1'
      console.log('fetching user data', fetchUrl)
      return request.get({
        url: fetchUrl
      }, function(err, results, body){
        body = JSON.parse(body)
        form.icon_url = body.user.profile.image_original || body.user.profile.image_512 || body.user.profile.image_32
        form.username = body.user.real_name+' (@'+body.user.name+')'
        console.log(form)
        request.post({
          uri: reciever.incoming_url,
          form: {
            payload:JSON.stringify(form)
          }
        }, function(err, results, body){
          resolve()
        })
      })
    }
    console.log(form)
    request.post({
      uri: reciever.incoming_url,
      form: {
        payload:JSON.stringify(form)
      }
    }, function(err, results, body){
      resolve()
    })
  })
}
