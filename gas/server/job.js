function clearPastWatchList() {
  const io = constants.getIo()
  const watchList = io.getWatchList()
  const today = new Date(new Date().toLocaleDateString())
  const newList = watchList.filter(function(record){
    return record.endTime.getTime() > today.getTime()
  })
  const oldList = watchList.filter(function(record){
    return record.endTime.getTime() <= today.getTime()
  })
  io.clearWatchList()
  newList.forEach(function(record){
    io.setWatchList(record)
  })
  oldList.forEach(function(record){
    io.setOldWatchList(record)
  })
}

function roomCheck() {
  const io = constants.getIo()
  const subscriber = Session.getActiveUser().getEmail()
  const watchList = io.getWatchList({
    filter: {
      subscriber: subscriber,
      status: '01_ウォッチ中',
    }
  })
  const user = {
    overMinutes: 5
  }

  if(watchList.length===0){
    const triggers = ScriptApp.getProjectTriggers()
    if(triggers.length>0){
      triggers.forEach(function(trigger){
        ScriptApp.deleteTrigger(trigger)
      })
    }
    return
  }

  watchList.forEach(function (record) {
    // 最新の予定を取得する
    const result = getEvent({
      calendarId: subscriber,
      eventId: record.eventId,
    })


    if(result.response === 'success') {
      const event = result.event

      record.summary = event.summary
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
      if (record.startTime.getTime() + user.overMinutes * 60 * 1000 < (new Date()).getTime()) {
        record.status = '03_時間切れ'
        io.setWatchList(record)
        return
      }

      //Freebusy一括問い合わせ, 15部屋ずつ
      const freebusy = {calendars:{}}
      const lot=15

      for(var i=0; i<record.watchRooms.length; i+=lot){
        Object.assign(freebusy.calendars,
          Calendar.Freebusy.query({
            timeMin: record.startTime.toISOString(),
            timeMax: record.endTime.toISOString(),
            items: record.watchRooms.slice(i,i+lot).map(function(room){return {id:room.calendarId}})
        }).calendars)
      }

      //開いた会議室を確認
      const roomsAvailable = record.watchRooms.filter(function(room) {
        const result = freebusy.calendars[room.calendarId]
        if(!result) return false
        if(!result.errors && result.busy.length === 0) {
          return true
        } else {
          return false
        }
      })
/*
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
*/
      // 空いていれば、会議室を追加する
      if (roomsAvailable.length) {
        if(!event.attendees) event.attendees=[]
        const myguests = event.attendees.concat(roomsAvailable.map(function(room){return {email: room.calendarId}}))

        // 会議室名を取得　to do
        const rooms = roomsAvailable.map(function(room){
          const temp = Calendar.Calendars.get(room.calendarId)
          return {
            name: temp.summary ? temp.summary : room.name
          }
        })

        const response = runGoogleScript('addGuests', {
          calendarId: subscriber,
          eventId: record.eventId,
          guests: myguests,
        })

        //メール文作成・送付
        const template = HtmlService.createTemplateFromFile('server/mail')
        template.summary = event.summary
        template.htmlLink = event.htmlLink
        template.startDate = Utilities.formatDate(record.startTime, 'JST', 'MM/dd')
        template.startTime = Utilities.formatDate(record.startTime, 'JST', 'HH:mm')
        template.endTime= Utilities.formatDate(record.endTime, 'JST', 'HH:mm')
        template.rooms = rooms

        const htmlBody = template.evaluate().getContent()
        const message = {
          to: record.subscriber,
          name: '会議室ウォッチ',
          subject: '[自動送信]会議室取得連絡',
          htmlBody: htmlBody,
          options: {
            noReply: true,
          },
        }
        MailApp.sendEmail(message)

        //空き取得済に
        record.status = '05_空き取得済'
        io.setWatchList(record)
      }
    }
  })
}
