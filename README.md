# calendar

## Initialization 
### step 1
create .clasp.json at root directory
```
{
  "scriptId":[your script id],
  "rootDir":"gas"
}
```
### step 2
upload `calendar_db.xlsx` to create a google spreadsheet.
open gas editor, click on file>project properties, choose Script Properties tab, then register the spreadId as a script parameter.
```
{
  Property: "spreadId",
  Value: [your spread Id (URL)]
}
```
