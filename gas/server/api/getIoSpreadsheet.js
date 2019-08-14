/*
使い方
//function testGetIoSpreadsheet() {
//  //コンフィグの中で割当
//  const getIo = getIoSpreadsheet;
//
//  //利用する関数の頭でまず生成
//  const io = getIo()
//  //利用するときにメソッドを呼び出す
//  var records = io.getRecords()
//  var result = io.setRecord()
}
*/
function getIoSpreadsheet() {
  const SPREAD_ID = PropertiesService.getScriptProperties().getProperty('spreadId')
  if (!SPREAD_ID) {
    throw {
      message: 'no spreadId fount in script properties'
    }
  }
  const TBL_USER_SETTINGS = 'userSettings'
  const TBL_ROOMS = 'rooms'
  const TBL_WATCH_LIST = 'watchList'
  const SPREAD_SHEET_LOG = '会議室追加ログ'
  const SPREAD_SHEET_WATCH_LIST = '予約状況'
  const CELL_ROOM_NUM = 'I3'

  const OFFSET_ROWS = 7
  const OFFSET_COLUMNS = 9

  // 初期化（設定値取得）
  const spread = SpreadsheetApp.openById(SPREAD_ID)
  const sheetUserSettings = spread.getSheetByName(TBL_USER_SETTINGS)
//  const sheetWatchList = spread.getSheetByName(SPREAD_SHEET_WATCH_LIST)
  const sheetWatchList = spread.getSheetByName(TBL_WATCH_LIST)
  const nRooms = sheetWatchList.getRange(CELL_ROOM_NUM).getValue()
  const sheetRooms = spread.getSheetByName(TBL_ROOMS)

//  const rooms = []
//  const s = sheetRooms.getRange(1, OFFSET_COLUMNS + 1, OFFSET_ROWS, nRooms).getValues();
/*
  for (var i = 0; i < nRooms; i++) {
    rooms.push({
      id: s[0][i],
      longName: s[2][i],
      name: s[1][i],
      defaultStatus: s[3][i],
      capacity: s[4][i],
      startDate: s[5][i],
      endDate: s[6][i],
    })
  }
*/
  // ioを返す。get[*](*はオブジェクト名)で利用
  return {
    sheetUserSettings: sheetUserSettings,
    sheetWatchList: sheetWatchList,
    sheetRooms: sheetRooms,
    sheetWatchList: sheetWatchList,
    sheetLog: spread.getSheetByName(SPREAD_SHEET_WATCH_LIST),
    NUM_ROOMS: nRooms,
    OFFSET_ROWS: OFFSET_ROWS,
    OFFSET_COLUMNS: OFFSET_COLUMNS,
//    ROOMS: rooms,

    getUserSettings: function(user){
      const data = this.sheetUserSettings.getDataRange().getValues()
      const header = data[1]
      const result = []
      for(var i=2; i<data.length; i++){
        result.push({})
        for(var j=0; j<header.length; j++){
          result[i-2][header[j]]=data[i][j]
        }
      }
      return result
    },

    getWatchList: function() {
      const data = this.sheetWatchList.getDataRange().getValues()
      const header = data[1]
      const results = []
      for(var i=2; i<data.length; i++){
        results.push({})
        for(var j=0; j<header.length; j++){
          results[i-2][header[j]]=data[i][j]
        }
      }
      results.forEach(function(result){
        result.watchRooms = JSON.parse(result.watchRooms)
      })
      return results
    },

    setUserSettings: function(payload){
      const data = this.sheetUserSettings.getDataRange().getValues()
      const header = data[1]

      const iKey = header.findIndex(function(item){
        return item === this.key
      },{key: 'email'})
      var i
      for(i=2; i<data.length; i++){
        if(payload.email === data[i][iKey]) break
      }

      var l = header.length

      const updateRange = sheetUserSettings.getRange(i+1,1,1,header.length)
      updateRange.setValues([
        header.map(function(line) {
          return payload[line]
        }, {header: header, value: payload})
      ])
      return 'updated'
    },

    getRooms: function(){
      const data = this.sheetRooms.getDataRange().getValues()
      const header = data[1]
      const result = []
      for(var i=2; i<data.length; i++){
        result.push({})
        for(var j=0; j<header.length; j++){
          result[i-2][header[j]]=data[i][j]
        }
      }
      return result
    },

    getAllRecords: function() {
      const data = this.sheetWatchList.getDataRange().getValues()
      const records = data
        // 抽出:
        .slice(OFFSET_ROWS)
        // 変換:
        .map(this.watchListGetter, this)
      return records
    },
    setRecord: function(record) {
      if (!record || !record.subscriber || !record.created) {
        throw 'record.subscriber and record.created must not null'
      }
      const data = this.sheetWatchList.getDataRange().getValues()
      var index = data.slice(OFFSET_ROWS).findIndex(function(item) {
        return (
          item[0] === record.subscriber &&
          item[2] === record.event.eventId &&
          item[6].getTime() === record.created.getTime()
        )
      })
      if (index === -1) index = data.length - OFFSET_ROWS

      const line = this.watchListSetter(record)
      this.sheetWatchList
        .getRange(index + this.OFFSET_ROWS + 1, 1, 1, this.OFFSET_COLUMNS + this.NUM_ROOMS)
        .setValues([line])
    },
    setLog: function(log) {

    },

    // getterとsetter
    watchListGetter: function(item) {
      return {
        subscriber: item[0],
        status: item[1],
        created: item[6],
        updated: item[7],
        event: {
          eventId: item[2],
          startTime: item[3],
          endTime: item[4],
          summary: item[5],
          htmlLink: item[8],
        },
        rooms: item
          .slice(this.OFFSET_COLUMNS, this.OFFSET_COLUMNS + this.NUM_ROOMS)
          .map(function(status, i) {
            return {
              id: rooms[i].id,
              longName: rooms[i].longName,
              name: rooms[i].name,
              status: status,
            }
          }, {
            rooms: this.ROOMS,
          })
      }
    },
    watchListSetter: function(record) {
      return [
        record.subscriber,
        record.status,
        record.event.eventId,
        record.event.startTime,
        record.event.endTime,
        record.event.summary,
        record.created,
        record.updated,
        record.event.htmlLink,
      ].concat(
        record.rooms.map(function(room) {
          return room.status
        })
      )
    },
    logSetter: function(item) {
      return [
        item.currentUser,
        item.statusCode,
        item.message,
        item.roomName,
        item.startTime,
        item.endTime,
        item.summary,
        item.roomId,
        item.eventId,
        item.currentTime
      ]
    },
  }
}
