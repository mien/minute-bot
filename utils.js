module.exports.isBotCommand = function (msg) {
  let response = false;
  if (msg && msg.entities && msg.entities.length > 0) {
    msg.entities.forEach((entity) => {
      if (entity.type == 'bot_command') {
        response = true;
      }
    });
  }
  return response;
}

module.exports.stripCommand = function (msg) {
  if (msg && msg.entities && msg.entities.length > 0) {
    return msg.text.substring(msg.entities[0].offset + msg.entities[0].length).trim()
  }
}

module.exports.listMsg = function (list_msg) {
  let count = 1;
  let response_txt = ''
  list_msg.forEach((element) => {
    response_txt += count + '. ' + element + '\n';
    count++;
  })
  return response_txt;
}

module.exports.urlEntity = function (msg) {
  let response = false;
  if (msg && msg.entities && msg.entities.length > 0) {
    msg.entities.forEach((entity) => {
      if (entity.type == 'url') {
        response = msg.text.substring(entity.offset, entity.end);
      }
    })
  }
  return response
}
