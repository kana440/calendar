function roomCheck() {
  const io = constants.getIo()
  const subscriber = Session.getActiveUser().getEmail()
  const watchList = io.getWatchList({
    filter: {
      subscriber: subscriber,
      status: '01_ウォッチ中',
    }
  })

  watchList.forEach(function (record) {
    // 最新の予定を取得する
    const result = getEvent({
      calendarId: subscriber,
      eventId: record.eventId,
    })

    if(result.response === 'success') {
      const event = result.event
      // ToDo: 予定の時間が変更されていたら時間を変更してDBもアップデート
      if(event.startTime.getTime() !== record.startTime.getTime()
        || event.endTime.getTime() !== record.endTime.getTime()
        ) {
          record.startTime = event.startTime
          record.endTime = event.endTime
          io.setWatchList(record)
        }
      // 予定がキャンセルされていたら削除する
      if(event.status === constants.EVENT_CANCELLED ){
        record.status = '09_キャンセル'
        io.setWatchList(record)
        return
      }
      // 時間ぎれでないか更新する
      if (record.endTime.getTime() < (new Date()).getTime()) {
        record.status = '03_時間切れ'
        io.setWatchList(record)
        return
      }

      // ウォッチ対象の会議室の予定を確認し、空いている会議室を取得する
      const roomsAvailable = record.watchRooms.filter(function (room) {
        const result = getCalendarEvents({
          calendarId: room.calendarId,
          startTime: record.startTime,
          endTime: record.endTime,
        })
        switch(result.response){
          case 'has no events': {
            return true
          }
          case 'has events': {
            return result.items.every(function(event){
              if(!event.attendees) return false
              const self = event.attendees.find(function(attendee){
                return attendee.email === room.calendarId
              })
              if(!self || self.responseStatus !== 'declined') return false
              //declinedのときはhas no event
              return true
            })
          }
          default: {
            return false
          }
        }

      })

      // 空いていれば、会議室を追加する
      if (roomsAvailable.length) {
        const roomsAdded = roomsAvailable.map(function (room) {
          return addGuests({
            calendarId: subscriber,
            eventId: record.eventId,
            guests: roomsAvailable.map(function(room){return {email: room.calendarId}}),
          })
        })
        //ToDo: メール送付
/*
        const messageAdded = createAddedMessage(record, roomsAdded)
        MailApp.sendEmail(messageAdded)
*/
        //空き取得済にして帰る
        record.status = '05_空き取得済'
        io.setWatchList(record)
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
