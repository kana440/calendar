// clientからの呼出しに使う
function execute(func, payload) {
  return eval(func + '(payload)')
}

function apiGetCalendarEvents(payload) {
  const calendarId = payload.calendarId
  const startTime = new Date(payload.dateString)
  const endTime = new Date(payload.dateString)
  endTime.setDate(endTime.getDate()+1)
  const result = getCalendarEvents({
    calendarId: calendarId,
    startTime: startTime,
    endTime: endTime,
  })
  result.date = payload.dateString
  return JSON.parse(JSON.stringify(result))
}
// カレンダIdおよび時刻(min,max)を指定して予定を取得する
function getCalendarEvents(payload) {
  // payloadの分割(ES6なら引数分割を使えるが、使えないので地道に展開)
  const calendarId = payload.calendarId
  const startTime = payload.startTime
  const endTime = payload.endTime
  if (!calendarId || !startTime || !endTime) {
    throw 'arguments required'
  }
  const option = {
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    singleEvents: true,
    showDeleted: false,
    orderBy: 'startTime',
  }
  // CalendarAPIの実行
  try {
    const items = Calendar.Events.list(calendarId, option).items
      // 条件:キャンセルされている予定は除く
      .filter(function (item) {
        return item.status !== constants.EVENT_CANCELLED
      })
      // 変換:null等は適切な文字列に変換
      .map(eventGetter)

    // 予定の有無を取得
    return {
      calendarId: calendarId,
      response: items.length === 0 ? 'has no events' : 'has events',
      items: items,
    }
  } catch (e) {
    // Calendar(=会議室)に照会権限が無い場合は例外になる。
    return {
      calendarId: calendarId,
      startTime: startTime,
      endTime: endTime,
      response: 'access denied',
      items: [],
    }
  }
}

function getEvent(payload) {
  const calendarId = payload.calendarId
  const eventId = payload.eventId
  if (!calendarId || !eventId) {
    throw 'arguments required'
  }
  try {
    return {
      response : 'success',
      event: eventGetter(Calendar.Events.get('primary', eventId)),
    }
  } catch (e) {
    return {
      response: 'NG',
      event: null
    }
  }
}

function addGuest(payload) {
  //payloadの分割(ES6なら引数分割を使えるが、使えないので地道に展開)
  const eventId = payload.eventId;
  const roomId  = payload.roomId;
  if (!eventId || !roomId) {
    throw 'arguments required'
  }

  //1.最新の予定を取得、キャンセル済か過去の場合は取らない。

  const event = getEvent({
    calendarId: 'primary',
    eventId: eventId}).event;

  if (!event) {
      return 'NG-others(event not exist)'
  }

  if (event.status === 'cancelled') {
    return 'NG-event cancelled(event not exists)'
  }

  if (new Date().getTime() > (new Date(event.endTime)).getTime()) {
    return 'NG-time overed'
  }

  //2.会議室の状況を確認
  //google Calendar option
  const result = getCalendarEvents({
    calendarId: roomId,
    startTime: event.startTime,
    endTime: event.endTime,
  })

  if (result.response === 'access denied') {
    return 'NG-room not authorized or invalid calendar'
  }

  const items = result.items

  if(items.length) {
    const item = items.find(function(item){
      return item.eventId === this.eventId
    },{
      eventId: eventId
    })

    // 自分の予定がなければ削除
    if(!item) {
      return 'NG-occupied'
    }

    //自分の予定があれば、会議室が確保されているかされていないか確認
    const attendee = item.attendees.find(function(attendee){
      return attendee.email === roomId
    })

    if(attendee.responseStatus === "declined"){
      return 'NG-already declined'
    } else {
      return 'INFO-already added'
    }
  }

  //取得処理（確保結果の確認）
  event.attendees = event.attendees || []
  event.attendees.push({ email: roomId })
  var event2 = Calendar.Events.patch({attendees: event.attendees }, 'primary', eventId, {
    sendNotifications: false
  });

  if(event2.attendees && event2.attendees.some(function(guest){
    return guest.email === roomId
  })) {
    // 会議室が追加されていればOK
    return 'OK-added'
  } else {
    return 'NG-event not add authorized'
  }
}

// 汎用的に呼ばれるサブルーチン・コールバック関数等を定義
function eventGetter(item) {
  var startTime, endTime
  if(item.start.dateTime) {
    startTime = new Date(item.start.dateTime)
    endTime = new Date(item.end.dateTime)
  } else {
    startTime = new Date(item.start.date)
    endTime = new Date(item.end.date)
    startTime.setHours(0)
    endTime.setHours(0)
  }

  return {
    eventId: item.id,
    startTime: startTime,
    endTime: endTime,
    summary: item.summary == null ? constants.SUMMARY_DEFAULT_JA : item.summary,
    location: item.location,//Optional
    description: item.description,//Optional
    organizer: item.organizer,//Optional
    visibility : item.visibility,//Optional,'private',undefined('default'),'public','confidential'
    htmlLink: item.htmlLink,
    attendees: item.attendees
  }
}
