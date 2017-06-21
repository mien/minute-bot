let client
const Promise = require('bluebird');

module.exports = (redisClient) => {
  client = redisClient;
  return List;
}


class List {
  constructor(name, sessionId) {
    this.list_key = name + sessionId;
    this.client = client;
  }

  add(msg, cb) {
    if (typeof (msg) == 'object') {
      this.client.lpush(this.list_key, JSON.stringify(msg), cb)
    } else {
      this.client.lpush(this.list_key, msg, cb)
    }
  }

  del(index, cb) {
    this.client.multi()
      .lindex(this.list_key, index)
      .lset(this.list_key, index, "DELETED")
      .lrem(this.list_key, index, "DELETED")
      .exec(cb)
  }
  list(start, end) {
    return new Promise((resolve, reject) => {
      this.client.lrange(this.list_key, start, end, (err, response) => {
        if (err) reject(err)
        if (response && response.length > 0) {
          let json_res = [];
          response.forEach((res) => {
            try {
              json_res.push(JSON.parse(res))
            } catch (e) {
              json_res.push(res)
            }
          })
          resolve(json_res);
        } else {
          resolve(response)
        }
      })
    })
  }
  flush() {
    return new Promise((resolve, reject) => {
      this.client.ltrim(this.list_key, 0, -1, (err, response) => {
        if (err) reject(err)
        resolve(response);
      })
    })

  }
  update(index, msg, cb) {
    this.client.lset(this.list_key, index, msg, cb)
  }
}
