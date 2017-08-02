require('dotenv').config()
const request = require('superagent')
const express = require('express')
const app = express()
const mysql = require('mysql')
const validator = require('validator')

app.use(require('body-parser').json({limit: '10mb'}))
app.use(express.static('public'))

////////////////////////////////////////////////////////////////////////
//                         Utility functions                          //
////////////////////////////////////////////////////////////////////////

const addrValidator = (str) => {
  return validator.matches(str, '^[0-9]+ .+$')
}

const avatarValidator = (str) => {
  return validator.matches(str, 'data:image\/([a-zA-Z]*);base64,([^\"]*)')
}

const cityValidator = (str) => {
  return validator.matches(str, '[a-z|A-Z| ]+')
}

const purgeCache = () => {
  if (!process.env.FASTLY_KEY || !process.env.SERVICE_ID) {
    console.log('not configured to clear cache.')
    return
  }
  const url = `${FASTLY_URL}/service/${process.env.SERVICE_ID}/purge_all`
  request
    .post(url)
    .set('Fastly-Key', process.env.FASTLY_KEY)
    .set('Accept', 'application/json')
    .end(function (err, res){
      if (err) console.error('error from fastly:', err)
      if (res.statusCode === 200) {
        console.log('cache cleared')
      } else {
        console.log('error clearing cache: ', res.statusCode)
      }
    })
}

////////////////////////////////////////////////////////////////////////
//                             Constants                              //
////////////////////////////////////////////////////////////////////////

const FASTLY_URL = 'https://api.fastly.com'

const DATA_MAP = {
  'Email': validator.isEmail,
  'LastName': validator.isAlpha,
  'FirstName': validator.isAlpha,
  'Address': addrValidator,
  'City': cityValidator,
  'Avatar': avatarValidator
}

////////////////////////////////////////////////////////////////////////
//                           Express routes                           //
////////////////////////////////////////////////////////////////////////

/**
 * Get all users
 */
app.get('/api/users', (req, res) => {
  connection.query('select * from Persons', (err, response) => {
    if (err) throw err
    res.setHeader('Cache-Control', 'no-cache') // user-agent does not cache
    res.setHeader('Surrogate-Control', 'max-age=86400') // Tell Fastly to cache this for a day
    res.send({ data: response })
  })
})

/**
 * Get one user
 */
app.get('/api/user/:userId', (req, res) => {
  connection.query(`select * from Persons where ID=${req.body.ID}`, (err, response) => {
    if (err) throw err
    res.setHeader('Cache-Control', 'no-cache') // user-agent does not cache
    res.setHeader('Surrogate-Control', 'no-cache') // Tell Fastly NOT to cache individual user requests
    res.send({ data: response })
  })
})

/**
 * Replace the data for one user record with a new set of data
 */
app.put('/api/user/:userId', (req, res) => {
  const fields = Object.keys(req.body).map((key) => {
    if (key === 'ID') return
    const validator = DATA_MAP[key]
    if (!validator) {
      console.log('key not valid: ', key)
    } else if (validator(req.body[key])) {
      return `${key} = "${req.body[key]}"`
    } else {
      console.log('data does not match validation-criteria: ', key)
    }
  }).filter(Boolean)
  const query = `update Persons set ${fields.join(', ')} where ID=${req.body.ID}`

  console.log('updating database...')
  connection.query(query, (err, response) => {
    if (err) throw err
    purgeCache()
    console.log('returning updated data...')
    connection.query(`select * from Persons where ID=${req.body.ID}`, (err, response) => {
      if (err) throw err
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Surrogate-Control', 'no-cache')
      res.send({ data: response })
    })
  })
})

////////////////////////////////////////////////////////////////////////
//                           Server startup                           //
////////////////////////////////////////////////////////////////////////

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

connection.connect((err) => {
  if (err) throw err
  console.log('Connected to mysql')
})

const port = process.env.NODE_PORT || 3333
const server = app.listen(port, () => console.log(`server listening on port ${port}`))

function cleanup () {
  server.close(() => {
    console.log('Closed out remaining connections.')
    connection.end()
    console.log('done')
    process.exit()
  })

  setTimeout(() => {
    console.error('Could not close connections in time, forcing shut down')
    process.exit(1)
  }, 30 * 1000)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
