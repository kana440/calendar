// clientからの呼出しに使う
function runGoogleScript(method, payload) {
  const methods = {
    getRooms: getRooms_,
    getUserSettings: getUserSettings_,
    getCalendarEvents: apiGetCalendarEvents_,
    getWatchList: getWatchList_,
    setUserSettings: setUserSettings_,
    setWatchList: setWatchList_,
    setTrigger: setTrigger_,
    addGuests: addGuests_,
    createEvent: apiCreateEvent_,
    deleteWatch: deleteWatch_,
    getFreeBusy: apiGetFreeBusy_,
    log: log_,
  }
// todo: parsePayload
//  if(!methods[method]) throw "no methods named " + method
  try {
    return methods[method](payload)
  } catch (e) {
    throw {
      response: 'error',
      massage: e,
    }
  }
}

function log_(payload){
  const io = constants.getIo()
  payload.time = new Date()
  io.appendLog(payload)
}

function apiCreateEvent_(payload){
  const calendarId = payload.calendarId
  const startTime = new Date(payload.startTimeString)
  const endTime = new Date(payload.endTimeString)
  const summary = payload.summary
  const attendees = payload.attendees

  const request = {
    start: {
      dateTime: startTime.toISOString()
    },
    end: {
      dateTime: endTime.toISOString()
    },
    summary: summary,
    attendees: attendees,
  }

  const result = _eventGetter_(
    Calendar.Events.insert(request, calendarId)
  )
  result.startTime = result.startTime.toISOString()
  result.endTime = result.endTime.toISOString()
  return result
}

function getRooms_(){
  const io = constants.getIo()
  const rooms = io.getRooms()
  return JSON.parse(JSON.stringify(rooms));
}

function getUserSettings_() {
  const currentUser = Session.getActiveUser().getEmail()
  const io = constants.getIo()
  const userSettings = io.getUserSettings({
    filter: {
      email: currentUser
    }
  })
  if(userSettings.length === 0) {
    return { email: currentUser }
  } else if (userSettings.length > 1) {
    throw 'key duplicated'
  }
  return userSettings[0]
}

function apiGetCalendarEvents_(payload) {
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

function getWatchList_() {
  const io = constants.getIo()
  const watchList = io.getWatchList()
  return JSON.parse(JSON.stringify(watchList))
}

function setUserSettings_(payload) {
  const currentUser = Session.getActiveUser().getEmail()
  if(payload.email !== currentUser) throw 'current user error'
  const io = constants.getIo()
  io.setUserSettings(payload)
}

function setWatchList_(payload) {
  // payload 分割
  const subscriber = payload.subscriber
  const status = payload.status
  const eventId = payload.eventId
  const startTimeString = payload.startTimeString
  const endTimeString = payload.endTimeString
  const summary = payload.summary
  const watchRooms = payload.watchRooms

  try{
    const io = constants.getIo()
    io.setWatchList({
      subscriber: subscriber,
      status: status,
      eventId: payload.eventId,
      startTime: new Date(startTimeString),
      endTime: new Date(endTimeString),
      summary: summary,
      watchRooms: watchRooms,
    })
  } catch(e) {
    return {
      response: 'error',
      error: JSON.stringify(e),
    }
  }
}

function setTrigger_(){
  const triggers = ScriptApp.getProjectTriggers().filter(function(trigger){
    return trigger.getHandlerFunction() === 'roomCheck'
  })
  if(triggers.length === 0 ){
    ScriptApp.newTrigger('roomCheck').timeBased().everyMinutes(5).create()
  }
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
      .map(_eventGetter_)

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
      event: _eventGetter_(Calendar.Events.get('primary', eventId)),
    }
  } catch (e) {
    return {
      response: 'NG',
      event: null
    }
  }
}

function addGuests_(payload) {
  // payloadの分割(ES6なら引数分割を使えるが、使えないので地道に展開)
  const calendarId = payload.calendarId
  const eventId = payload.eventId
  const guests  = payload.guests
  if (!calendarId || !eventId || !guests) {
    throw 'arguments required'
  }
  // 更新項目のみbodyに格納、更新のメール通知をoptionに設定
  const body = {
    attendees: guests
  }
  const options = {
    sendNotifications: false
  }
  // 会議室追加
  const result = _eventGetter_(
    Calendar.Events.patch(body, calendarId, eventId, options)
  )
  result.startTime = result.startTime.toISOString()
  result.endTime = result.endTime.toISOString()
  return result
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

function deleteWatch_(payload){
  const subscriber = payload.subscriber
  const eventId = payload.eventId
  if(!subscriber || !eventId){
    throw ('arg subscriber and eventId needed')
  }

  const io = constants.getIo()
  const records = io.getWatchList({
    filter: {
      subscriber: subscriber,
      eventId: eventId,
      status: '01_ウォッチ中',
    }
  })
  if(records.length===0) return
  if(records.length>1) throw 'multiple keys'

  const record = records[0]
  record.status="09_キャンセル"
  return io.setWatchList(record)
}

function apiGetFreeBusy_(payload){
  const startTimeString = payload.startTimeString
  const endTimeString = payload.endTimeString
  const rooms = payload.rooms
  if ( !startTimeString || !endTimeString || !rooms) {
    throw 'arg required'
  }
  const startTime = new Date(startTimeString)
  const endTime = new Date(endTimeString)

  const freebusy = Calendar.Freebusy.query({
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    items: rooms.map(function(room){return {id:room.calendarId}}),
  })
  return freebusy
}
// 汎用的に呼ばれるサブルーチン・コールバック関数等を定義
function _eventGetter_(item) {
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
    visibility : item.visibility == null ? 'default' : 'private',//Optional,'private',undefined('default'),'public','confidential'
    htmlLink: item.htmlLink,
    attendees: item.attendees,
    status: item.status,
  }
}
