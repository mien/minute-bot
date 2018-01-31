const bb = require('bot-brother');
const Promise = require('bluebird');
const redis = require('redis');
const addMeetingSection = require('./meeting-section-ctrl');
const redisClient = redis.createClient();
const RedisList = require('./list')(redisClient)
const utils = require('./utils');
const debug = require('debug')('bot_main')

const bot = bb({
  key: '47947300:AAH4Ab7KZy7-gq2E2R16Ks7oDiPu476Islw',
  sessionManager: bb.sessionManager.redis({
    client: redisClient
  }),
  polling: {
    interval: 0,
    timeout: 1
  }
});

let defaultReportSections = ['note', 'action'];
/*
action - actions we need to take after meeting
docs - important Documents of the meeting
note - meeting notes
report - get full meeting summary
*/

bot.use('before', bb.middlewares.typing())
bot.use('before', (ctx) => {
  debug('Received msg')
  if (ctx.isRedirected) return;
  const msg = ctx.message;
  debug('rev msg', msg);
  let url_entity = utils.urlEntity(msg)
  if (url_entity) {
    debug('Url detected')
    ctx.session.url = url_entity;
    ctx.go('docs')
  } else if (!utils.isBotCommand(msg)) {
    debug('not a bot command');
  }
  return;
  // return ctx.sendMessage('rgx before');
});

bot.command('start').invoke(function (ctx) {
  ctx.sendMessage('Hey guys I have help you to orgainze your meetings notes.\n/help to get more details.')
});

bot.command('help').invoke(function (ctx) {
  const help_msg = [
    '*Notes* - _things you done want to miss_',
    '*/note <text>* - meeting note will be recorded as list.',
    '*/note list* - list of all the notes.',
    '*/note del <index>* - delete the note on specified index',
    '\n*Actions* - _things you will do_',
    '*/action <text>* - meeting action will be recorded as list.',
    '*/action list* - list of all the actions.',
    '*/action del <index>* - delete the action on specified index.',
    '\n*Document* - _too much to read_',
    '*/docs <url>* - document url.',
    '*/docs list* - list of all the documents.',
    '*/docs del <index>* - delete the document on specified index.',
    '\n*Meeting summary*',
    '*/report* - get meeting summary so far.'
  ].join('\n')
  ctx.sendMessage(help_msg, {
    parse_mode: 'markdown'
  })
});

// bot.command(/.*/,(ctx)=>{})

function getDocsList(ctx) {
  const doc_list = new RedisList('docs', ctx.meta.sessionId)
  return doc_list.list(0, -1)
    .then((docs_json_list) => {
      let msg = []
      docs_json_list.forEach((docs_json) => {
        msg.push((msg.length + 1) + '. ' + docs_json.url + ' - ' + docs_json.desc)
      })
      return msg.join('\n')
    })
}

bot.command('docs')
  .invoke(function (ctx) {
    let msg = utils.stripCommand(ctx.message)
    debug('doc cmd', msg)
    if (!ctx.session.url) {
      if (msg == 'list') {
        return Promise.coroutine(function* () {
          ctx.sendMessage(yield getDocsList(ctx));
        })
        ctx.session = {}
        ctx.end()
      } else if (msg.startsWith('del')) {
        let sub_cmd = msg.split(' ')
        if (sub_cmd.length > 0) {
          let index = parseInt(sub_cmd[1])
          if (index) {
            const doc_list = new RedisList('docs', ctx.meta.sessionId)
            doc_list.del(index - 1, (err, data) => {
              if (err) {
                ctx.sendMessage('Invalid index ' + index);
              } else {
                debug('del docs data ', data)
                if (data[0]) {
                  data = JSON.parse(data[0])
                  ctx.sendMessage('deleted ' + data.url + ' - ' + data.desc)
                } else {
                  ctx.sendMessage('Invalid index ' + index);
                }
              }
            })
          } else {
            ctx.sendMessage('Invalid index.');
          }
        }
        ctx.session = {}
        ctx.end()
      } else {
        ctx.session.url = msg;
      }
    }

    if (ctx.session.url) {
      return ctx.sendMessage('Short description for the document ' + ctx.session.url + '\nreply *NO* if you want to ignore it.', {
        'parse_mode': 'markdown'
      })
    }
    return null;
  })
  .answer(function (ctx) {
    if (ctx.answer && ctx.answer.toLowerCase() == 'no') {
      return ctx.sendMessage('Got it ignored.');
    } else {
      ctx.session.desc = ctx.answer;
      debug(ctx.session)
      ctx._handler.name = 'no'
      const doc_list = new RedisList('docs', ctx.meta.sessionId)
      doc_list.add(ctx.session)
      delete ctx.session.url
      delete ctx.session.desc
      return ctx.sendMessage('OK great.');
    }
  });



bot.command('report')
  .invoke((ctx) => {
    let final_report_str = '*Meeting Summary *\n\n'
    Promise.coroutine(function* () {
      for (let sec_i = 0; sec_i < defaultReportSections.length; sec_i++) {
        const section_name = defaultReportSections[sec_i];
        debug(section_name)
        let list = new RedisList(section_name, ctx.meta.sessionId)
        final_report_str += "Section *" + section_name + ' :*\n'
        let bullet_points = yield list.list(0, -1)
        debug(bullet_points)
        final_report_str += utils.listMsg(bullet_points) + '\n'
      }
      final_report_str += 'Meetings *Documents* \n'
      final_report_str += yield getDocsList(ctx);
      ctx.sendMessage(final_report_str, {
        'parse_mode': 'markdown'
      })
    })();
  })


defaultReportSections.forEach((sec) => {
  addMeetingSection(bot, RedisList, sec)
})
