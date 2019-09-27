const stream = require('stream')
const Router = require('router')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const debug = require('debug')('dss')

const router = Router()
// object to store the requests
router.__dataStore = {}
router.__statusStore = {}

console.log('data before: ' + router.__dataStore[0])

const morganDebugStream = new stream.Writable({
  write: function (chunk, encoding, done) {
    // strip newlines (to avoid extra empty log items in the 'tiny' morgan protocol)
    const chunkData = chunk.toString().replace(/[\n\r]/g, '')

    if (chunkData.length > 0) {
      debug(chunkData)
    }
    done()
  }
})

router.use(morgan('tiny', { stream: morganDebugStream }))

router.param('id', (req, res, next, id) => {
  req.params = {
    id
  }
  next()
})

// parse all bodies up to 10mb regardless of mime type as a buffer
router.use(bodyParser.raw({ limit: '10mb', type: () => true }))


const bodyDebug = debug.extend('body')

//----------- post method-----------
router.post('/data/:id', (req, res) => {
  // id of the who ever sends the request, comes after /data/<deviceId>
  const deviceId = req.params.id

  if (!router.__dataStore[deviceId])
  {
    // make an empty array
    router.__dataStore[deviceId] = []
  }
  // log the body, using the debug body instance
  bodyDebug(req.body.toString())

  router.__dataStore[deviceId].push(req.body)
  //console.log('data before: ' + Object.keys(req.body))
  console.log('data before: ' + req.connection.remoteAddress)

  res.statusCode = 200
  res.end()
})

//------------ get method -------------
router.get('/data/:id/:remoteId', (req, res) => {
  const deviceId = req.params.id
  //console.log('req: ' + req)
  //console.log('req params: ' + req.params)
  console.log('req params id: ' + req.params.id)
  console.log("st: " + req.params.remoteId)
  if (!router.__dataStore[deviceId] || router.__dataStore[deviceId].length === 0) {
    res.statusCode = 404
    res.end()
  } else {
    const data = router.__dataStore[deviceId].shift()

    res.statusCode = 200
    res.end(data)
  }
})

router.put('/data/:id', (req, res) => {
    const deviceId = req.params.id
    if (!router.__dataStore[deviceId])
    {
      // make an empty array
      router.__dataStore[deviceId] = []
      // add a empty palceholder to message array
      router.__dataStore[deviceId][0] = undefined;
    }
    // log the body, using the debug body instance
    bodyDebug(req.body.toString())
    // replace the request everytime a new one is performed
    router.__dataStore[deviceId][0] = req.body;

    res.statusCode = 200
    res.end()
})

router.put('/status/:localId/:remoteId/:dateTime', (req, res) => {
  // id of the who ever sends the request, comes after /data/<deviceId>
  const local = req.params.localId
  const remote = req.params.remoteId
  var time = req.params.dateTime

  console.log('Time: ' + time)

  if (!router.__statusStore[local])
  {
    // make an empty array
    router.__statusStore.local = undefined;
  }
  // log the body, using the debug body instance
  bodyDebug(req.body.toString())
  var storedMsg = {localId: local, remoteId: remote, dateTime: time}
  storedMsg["body"] = req.body
  // replace the request everytime a new one is performed
  router.__statusStore.local = storedMsg;
  //console.log("Array length: " + router.__statusStore[local].length)
  console.log("remote: " + router.__statusStore.local.remoteId)
  console.log("date: " + router.__statusStore.local.dateTime)
  res.statusCode = 200
  res.end()
})

module.exports = router
