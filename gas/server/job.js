function isAddNeeded(record) {
  return record.subscriber === Session.getActiveUser().getEmail()
}

function roomCheck() {
  const io = constants.getIo()
  const recordsWatching = io.getAllRecords()
    .filter(function (item) {
      // 条件: ウォッチ中のみ
      return item.status === '01_ウォッチ中'
    })

  recordsWatching.forEach(function (record) {
    const event = record.event
    const rooms = record.rooms
    const currentTime = new Date()

    // 時間ぎれでないか更新する
    if (event.endTime.getTime() < currentTime.getTime()) {
      record.status = '03_時間切れ'
      io.setRecord(record)
      return
    }

    // ウォッチ対象の会議室の予定を確認し、空いている会議室を取得する
    const roomsAvailable = rooms.filter(function (room) {
      if (room.status) {
        const result = getCalendarEvents({
          calendarId: room.id,
          startTime: event.startTime,
          endTime: event.endTime,
        })
        if (result.response === 'has no events') return true
      }
      return false
    }, {
      event: event
    })

    if (roomsAvailable.length) {
      // addの場合
      if (isAddNeeded(record)) {
        const roomsAdded = roomsAvailable.map(function (room) {
          room.statusCode = addGuest({
            eventId: this.eventId,
            roomId: room.id,
          })
          return room
        }, event)
        if(roomsAdded.some(function(room){return room.statusCode === 'OK-added'})){
          const messageAdded = createAddedMessage(record, roomsAdded)
          MailApp.sendEmail(messageAdded)
          record.status = '05_空き取得済'
          io.setRecord(record)
        }else{
          throw 'error'
        }
      // ジョブ実行者と登録者と異なる場合はメール連絡を行う
      } else {
        const messageAvailable = createAvailableMessage(record, roomsAvailable)
        MailApp.sendEmail(messageAvailable)
        record.status = '02_空き連絡済'
        io.setRecord(record)
      }
    }
  })
}

function createAvailableMessage(record, roomsAvailable) {
  const htmlSummar = '<font face="arial, helvetica, sans-serif">'
    + '会議室が解放されました。<br><br>'
    + '予定名:<a href="{{htmlLink}}" target="_blank">'
    + '{{summary}}</a><br>'
    + '時間: {{startDate}} {{startTime}}-{{endTime}}'

  const htmlLine = '<br>会議室名: {{room.name}}<b>'
   + '（<a href="{{baseURL}}#/add/{{eid}}/{{roomId}}">'
   + '★クリックして今すぐ取得★</a>）</b>'

  const header = htmlSummar
    .replace('{{htmlLink}}', record.event.htmlLink)
    .replace('{{summary}}', record.event.summary)
    .replace('{{startDate}}',
      Utilities.formatDate(record.event.startTime, 'JST', 'MM/dd'))
    .replace('{{startTime}}',
      Utilities.formatDate(record.event.startTime, 'JST', 'HH:mm'))
    .replace('{{endTime}}',
      Utilities.formatDate(record.event.endTime, 'JST', 'HH:mm'))

  const details = roomsAvailable.map(function (room) {
    return htmlLine
      .replace('{{room.name}}', room.name)
      .replace('{{baseURL}}', ScriptApp.getService().getUrl())
      .replace('{{eid}}', Utilities.base64Encode(this.eventId))
      .replace('{{roomId}}', Utilities.base64Encode(room.id))
  }, {
    eventId: record.event.eventId,
    htmlLine: htmlLine,
  })

  const message = {
    to: record.subscriber,
    name: '会議室ウォッチ',
    subject: '[自動送信]会議室解放連絡',
    htmlBody: header + details.join(''),
    options: {
      noReply: true,
      // replyTo: 'foo@bar.com'
    },
  }
  return message
}

function createAddedMessage(record, roomsAdded) {
  const htmlSummar = '<font face="arial, helvetica, sans-serif">'
    + '会議室を取得しました。<br><br>'
    + '予定名:<a href="{{htmlLink}}" target="_blank">'
    + '{{summary}}</a><br>'
    + '時間: {{startDate}} {{startTime}}-{{endTime}}'

  const htmlLine = '<br>会議室名: {{room.name}} ステータス:<b>'
  + '{{room.statusCode}}</b>'

  const header = htmlSummar
    .replace('{{htmlLink}}', record.event.htmlLink)
    .replace('{{summary}}', record.event.summary)
    .replace('{{startDate}}',
      Utilities.formatDate(record.event.startTime, 'JST', 'MM/dd'))
    .replace('{{startTime}}',
      Utilities.formatDate(record.event.startTime, 'JST', 'HH:mm'))
    .replace('{{endTime}}',
      Utilities.formatDate(record.event.endTime, 'JST', 'HH:mm'))

  const details = roomsAdded.map(function (room) {
    return htmlLine
      .replace('{{room.name}}', room.name)
      .replace('{{room.statusCode}}', room.statusCode)
  }, {
    eventId: record.eventId,
    htmlLine: htmlLine,
  })

  const message = {
    to: record.subscriber,
    name: '会議室ウォッチ',
    subject: '[自動送信]会議室取得連絡',
    htmlBody: header + details.join(''),
    options: {
      noReply: true,
      // replyTo: 'foo@bar.com'
    },
  }
  return message
}
