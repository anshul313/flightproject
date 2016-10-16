#!/usr/bin/env python3

import requests
import json
import os

url = 'http://localhost:3000'
#url = 'http://api.earthly58.hasura-app.io'
headers = {'Content-Type': 'application/json',
           'X-Hasura-Role': 'user',
           'X-Hasura-User-Id': 59 }

def t1():
    response = requests.post(url + '/checkin/request', headers = headers, data = json.dumps({
        'from': 59,
        'from_username': 'mamidi',
        'to': 58,
        'flight_id': 9774,
        'flight_time': '2016-09-23T12:00:00Z'
    }))
    print(response.status_code)
    print(response.text)

def t2():
    response = requests.post(url + '/checkin/update', headers = headers, data = json.dumps({
        'from': 58,
        'to': 59,
        'flight_id': 9774,
        'flight_time': '2016-09-23T12:00:00Z',
        'request_type': 'accepted'
    }))
    print(response.status_code)
    print(response.text)

def t3():
    response = requests.post(url + '/like', headers = headers, data = json.dumps({
        'from_user': 39,
        'to_user': 35,
        'from_username': 'jaison',
        'to_username': 'rahul'
    }))
    print(response.status_code)
    print(response.text)

def t4():
    accessToken = os.environ['LINKEDIN'] #The linkedin access token set on the env var to prevent it getting added to the git repo
    response = requests.get(url + '/linkedin-profile/' + accessToken, headers = headers)
    print(response.status_code)
    print(response.text)

def t5():
    accessToken = os.environ['FB'] #The linkedin access token set on the env var to prevent it getting added to the git repo
    response = requests.post(url + '/mutual-friends', headers = headers, data=json.dumps(
        {
            'myToken': accessToken,
            'otherId': '100001410587055' #This is a string, not an integer
        }))
    print(response.status_code)
    print(response.text)

## test for checked in request
def t6():
    response = requests.post(url + '/checkin/request', headers = headers, data = json.dumps({
        'from': 59,
        'from_username': 'anil',
        'to': 60,
        'flight_id': 9774,
        'flight_time': '2016-10-04T12:00:00Z'
    }))
    print(response.status_code)
    print(response.text)
def feedbackmailtest():
    response = requests.post(url + '/send-feedback', headers = headers, data = json.dumps({
        'usermail': 'mamidianilkumar@gmail.com',
        'feedback_msg': 'Hi this is a test message',
        'user_id': 46,
    }))
    print(response.status_code)
    print(response.text)

def forceupdate():
    response = requests.post(url + '/appversion', headers = headers, data = json.dumps({
	'version': '1.0'
}))

    print(response.status_code)
    print(response.text)

t1()
t2()
#t3()
#t5()
#t6()
#feedbackmailtest()
#forceupdate()
