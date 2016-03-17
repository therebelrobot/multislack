'use strict'

const _ = require('lodash')
const request = require('request')

const MultiSlack = function (props) {
  // prop checking here
  return webhookCtrl.bind({props: props})
}

module.exports = MultiSlack

function webhookCtrl (req, res, next) {
  let props = this.props
  let payload = req.body
  if (payload.bot_id) {
    return res.status(200).json({})
  }
  let thisSender = _.filter(props.teams, {team_domain: payload.team_domain})
  if (!thisSender.length) {
    return res.status(403).json({text: 'Team not authorized for multislacking.'})
  }
  thisSender = thisSender[0]
  // check outgoing token

  let recievers = _.reject(props.teams, thisSender)
  let recieverCalls = []
  recievers.forEach((reciever) => {
    recieverCalls.push(callReciever(reciever, payload, thisSender, props))
  })
  Promise.all(recieverCalls).then(function () {
    res.status(200).json({})
  })
}
function callReciever (reciever, payload, thisSender, props) {
  return new Promise(function (resolve, reject) {
    var form = {}
    form.text = '_(from ' + thisSender.team_domain + ')_\n' + payload.text
    if (props.bot.icon_url) {
      form.icon_url = props.bot.icon_url
    }
    if (props.bot.icon_emoji) {
      form.icon_emoji = props.bot.icon_emoji
    }
    if (props.bot.username) {
      form.username = props.bot.username
    }
    if (props.bot.fetchUserInfo) {
      var fetchUrl = 'https://slack.com/api/users.info?token='
      fetchUrl += thisSender.auth_token
      fetchUrl += '&user='
      fetchUrl += payload.user_id
      fetchUrl += '&pretty=1'
      return request.get({
        url: fetchUrl
      }, function (err, results, body) {
        body = JSON.parse(body)
        form.icon_url = body.user.profile.image_original || body.user.profile.image_512 || body.user.profile.image_32
        form.username = body.user.real_name + ' (@' + body.user.name + ')'
        var angleBracketsRegex = /\<(.*?)\>/g
        var references = form.text.match(angleBracketsRegex)
        if (references && references.length) {
          references = _.uniq(references)
          console.log(references)
          var ignoreTags = [
            '<!here|@here>',
            '<!here|here>',
            '<!here>',
            '<@USLACKBOT>',
            '<!channel>',
            '<!group>',
            '<!everyone>'
          ]
          references = _.reject(references, function (reference) {
            return ignoreTags.indexOf(reference) > -1
          })
          var referenceCalls = []
          references.forEach(function (match, index) {
            match = match.substr(1)
            match = match.substring(0, match.length - 1)
            var callUrl
            var type
            if (match.indexOf('#') === 0) {
              match = match.substr(1)

              type = 'channel'
              callUrl = 'https://slack.com/api/channels.info?token='
              callUrl += thisSender.auth_token
              callUrl += '&channel='
              callUrl += match
              callUrl += '&pretty=1'
            } else {
              match = match.substr(1)

              type = 'user'
              callUrl = 'https://slack.com/api/users.info?token='
              callUrl += thisSender.auth_token
              callUrl += '&user='
              callUrl += match
              callUrl += '&pretty=1'
            }
            function callAPI (url, thisType) {
              return new Promise(function (resolve, reject) {
                request.get({
                  url: url
                }, function (err, results, body) {
                  if (err) return resolve(null)
                  body = JSON.parse(body)
                  var name = body[thisType].name
                  name = thisType === 'channel' ? '#' + name : '@' + name
                  resolve(name)
                })
              })
            }
            referenceCalls.push(callAPI(callUrl, type))
          })
          // call it now
          Promise.all(referenceCalls).then(function (results) {
            references = _.map(references, function (ref, index) {
              return {
                original: ref,
                replace: results[index]
              }
            })
            references.forEach(function (reference) {
              form.text = form.text.split(reference.original).join(reference.replace)
            })
            console.log(form)
            request.post({
              uri: reciever.incoming_url,
              form: {
                payload: JSON.stringify(form)
              }
            }, function (err, results, body) {
              resolve()
            })
          })
        } else {
          console.log(form)
          request.post({
            uri: reciever.incoming_url,
            form: {
              payload: JSON.stringify(form)
            }
          }, function (err, results, body) {
            resolve()
          })
        }
      })
    }
    request.post({
      uri: reciever.incoming_url,
      form: {
        payload: JSON.stringify(form)
      }
    }, function (err, results, body) {
      resolve()
    })
  })
}
