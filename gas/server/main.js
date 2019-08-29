// doGet
function doGet(request) {
  var tmp = HtmlService.createTemplateFromFile('client/index');
  return tmp.evaluate().setTitle('会議室取得ツール');
}

// gasのファイル(html)をインポートする
// html上で使うときは<?!=include('filename');?>とする
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

function test() {
  const properties = PropertiesService.getScriptProperties();
  if( !properties.getProperty('scriptId') ){
    Logger.log('no scriptId');
    properties.setProperty('spreadId','1-RkJT08sJV3BZwBzOkaL1vMJ0I30i9e7XiOxx9sHzCw')
  } else {
    Logger.log('spreadId is' + properties.getProperty('scriptId'));
  }
}

function setJob(){
  ScriptApp.getProjectTriggers().filter(function(trigger){
    return trigger.getHandlerFunction() === 'roomCheck'
  }).forEach(function(trigger){
    ScriptApp.deleteTrigger(trigger)
  })
  ScriptApp.newTrigger('roomCheck').timeBased().everyMinutes(5).create()
}

function getUserSettings() {
  const io = constants.getIo()
  const currentUser = Session.getActiveUser().getEmail()
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

function setUserSettings(payload) {
  const currentUser = Session.getActiveUser().getEmail()
  if(payload.email !== currentUser) throw 'current user error'
  const io = constants.getIo()
  io.setUserSettings(payload)
}

function getRooms(){
  const io = constants.getIo()
  const rooms = io.getRooms()
  return JSON.parse(JSON.stringify(rooms));
}

function getWatchList() {
  const io = constants.getIo()
  const watchList = io.getWatchList()
  return JSON.parse(JSON.stringify(watchList))
}

function setWatchList(payload) {
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

function testWatchList(){
  setWatchList({
    subscriber: 'y.k.kanamori@gmail.com',
    eventId: '233ljuu6fuedvb789hfuidle7s',
    summary: 'testSummary',
  })
}
