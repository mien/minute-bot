const utils = require('./utils');
module.exports = function (bot, RedisList, listName) {
  bot.command(listName)
    .invoke(function (ctx) {
      const list = new RedisList(listName, ctx.meta.sessionId)
      let msg = utils.stripCommand(ctx.message)
      let sub_cmd = msg.split(' ')

      switch (sub_cmd[0]) {

      case 'list':
        list.list(0, -1)
          .then((response) => {
            var response_txt = '\n\n Meeting *' + listName + 's* : \n'
            response_txt += utils.listMsg(response)
            ctx.sendMessage(response_txt, {
              'parse_mode': 'markdown'
            })
          })
        break;

      case 'del':
        let index;
        try {
          index = parseInt(sub_cmd[1]);
        } catch (err) {
          return ctx.sendMessage('invalid ' + listName + ' index')
        }
        console.log(listName + ' index', index)
        if (index) {
          const list = new RedisList(listName, ctx.meta.sessionId)
          index -= 1
          list.del(index, (err, response) => {
            if (response[0]) {
              const note_del_data = response[0]
              ctx.sendMessage('deleted ' + note_del_data)
            } else {
              ctx.sendMessage('Invalid' + listName + ' index ' + (index + 1));
            }
          })
        } else {
          return ctx.sendMessage('index of ' + listName + ' to delete is required')
        }
        break;

      default:
        if (msg.length > 0) {
          list.add(msg)
          return ctx.sendMessage('Noted');
        } else {
          return ctx.sendMessage('nothing to record');
        }
      }
    })
}
