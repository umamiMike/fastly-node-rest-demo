/* eslint-disable no-unused-vars */
import React, { Component } from 'react'
import {
  Alert, Col, Jumbotron, Grid, FormGroup, FormControl,
  ControlLabel, HelpBlock, Panel, Row
} from 'react-bootstrap'
import {
  BrowserRouter as Router,
  Route,
  Link,
  withRouter
} from 'react-router-dom'
import axios from 'axios'
import Admin from './Admin'
import Login from './Login'
import Logout from './Logout'
import User from './User'
import './App.css'
/* eslint-enable no-unused-vars */

const AUTH_STATES = {
  UNKNOWN: 0,
  CHECKING: 1,
  LOGGED_OUT: -1,
  LOGGED_IN: 2,
  BAD_PASSWORD: 3
}

class App extends Component {
  constructor () {
    super(...arguments)
    this.axios = axios.create()
    this.axios.defaults.headers.common['Content-Type'] = 'application/json'
    this.axios.defaults.headers.get['Content-Type'] = 'application/json'
    this.axios.defaults.headers.post['Content-Type'] = 'application/json'
    // axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
    this.state = {
      currentUser: {},
      auth: {
        id: null,
        state: AUTH_STATES.UNKNOWN,
        username: '',
        password: ''
      }
    }
    this.onUserChange = this.onUserChange.bind(this)
    this.onUserLogin = this.onUserLogin.bind(this)
    this.onUserLogout = this.onUserLogout.bind(this)
  }

  onUserLogout () {
    this.axios.get('/api/logout')
      .then(() => {
        window.location = '/login'
      })
      .catch((error) => {
        console.log('error on logout:', error)
      })
  }

  onUserLogin () {
    const newAuth = {
      state: AUTH_STATES.CHECKING,
      username: this.state.auth.username,
      password: this.state.auth.password
    }
    this.setState({auth: newAuth})

    this.axios.post('/api/login', this.state.auth)
      .then(output => {
        console.log('success', output)
        const newAuth = {
          state: AUTH_STATES.LOGGED_IN,
          id: output.data.id,
          username: output.data.username
        }
        this.setState({auth: newAuth})
        window.location = '/user'
      })
      .catch(error => {
        console.log('error', error)
        if (error.response.status === 401) {
          const newAuth = {
            state: AUTH_STATES.BAD_PASSWORD,
            username: this.state.auth.username,
            password: ''
          }
          this.setState({auth: newAuth})
        } else {
          console.warn('UNKNOWN ERROR', error)
        }
      })
  }

  onUserChange (field, value) {
    const authCopy = Object.assign({}, this.state.auth)
    authCopy[field] = value
    this.setState({auth: authCopy})
  }

  checkAuth () {
    this.axios.get('/api/profile')
      .then(output => {
        const newAuth = {
          id: output.data.user.id,
          username: output.data.user.username,
          state: AUTH_STATES.LOGGED_IN
        }
        this.setState({auth: newAuth, currentUser: output.data.extra})
        if (['/login?', '/login', '/'].includes(window.location.pathname)) {
          window.location = '/user'
        }
      })
      .catch(error => {
        this.setState({auth: {state: AUTH_STATES.LOGGED_OUT}})
        console.log('ERROR: ', error)
        if (window.location.pathname !== '/login') {
          window.location = '/login'
        }
      })
  }

  componentWillMount () {
    this.checkAuth()
  }

  render () {
    if (this.state.auth.state === AUTH_STATES.UNKNOWN) {
      return (
        <h1>Checking auth...</h1>
      )
    }
    return (
      <Router>
        <div>
          <Grid>
            <Row>
              <Route path="/logout" component={Logout}/>
              <Route path="/admin" render={() => (
                <Admin
                  onUserLogout={this.onUserLogout}
                />
              )}/>
              <Route path="/login" render={() => (
                <Login
                  auth={this.state.auth}
                  onSubmit={this.onUserLogin}
                  onUserChange={this.onUserChange}
                />)}
              />
              <Route path="/user" render={() => (
                <User
                  auth={this.state.auth}
                  currentUser={this.state.currentUser}
                />)}
              />
            </Row>
          </Grid>
        </div>
      </Router>
    )
  }
}

// export default App
export default withRouter(App)
