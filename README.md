# OOP-Widget
Out of Pocket cost widget
## Introduction

This project is a Out of Pocket Flex Connector for connecting to Rapid Health collection and insurance plan information.

The calculator will take into account the member's insurance plan benefits and the user's accumulated benefits to provide an out-of-pocket cost estimate. This break-down will then be displayed in the mobile app.


## Installation

To use this widget, clone this GitHub repository, and install the associated dependencies:

```npm install```

```npm install -g kinvey-cli```

The DLC can either be deployed to the FlexService Runtime, or run locally.  To run locally, use ngrok.
Execute:

```
ngrok http 10001
node .
```

Create a flex service Internal OOP, then deploy to Kinvey Flex container:
  Execute:

```
npm run deploy

v0.1.1
Deploy initiated. Job: 0dabb32b8f24434a991912804beb7647

npm run status

Job status: COMPLETE
key            value                             
-------------  ----------------------------------
status         ONLINE                            
version        0.1.1                             
id             dab03b8e52c748b1b05c625c5fd8b97e  
name           Internal OOP                      
requestedAt    Monday, July 23rd 2018, 4:58:23 PM
deployerEmail  ronald.heiney@progress.com        
```
## Dependencies

This OOP Flex Connector uses the following dependencies, in addition to the `kinvey-flex-sdk`:

Collections

* *user:* The user collection the first_name, last_name, dateOfBirth, memberId, planID, provider, payerName "pokitdok id"
* *health-plan:* Health plan 
* *eligibilty:* Rapid Health eligibility "Pokitdoc"
* *plan-benefit:* Benefit information
* *oop-service-cost:* Service cost information
* *oop:* Out of pocket widget service, create collection and assign to Internal OOP "oop data service" 
* *oop-services:* Service cost wrapper service, create collection and assign to Internal OOP "service data service"

## TEST
```
Request:
/appdata/kid_r1CYqYf4X/oop?query={"service_id":"","episode_name":"Knee Arthroscopy","category_name":"Day Of"}

Response:
{
        "episode": "Knee Arthroscopy",
        "episodeDesc": "TEXT",
        "service": "Knee Arthroscopy (Facility)",
        "dedIndRem": 2983.57,
        "oopIndRem": 2983.57,
        "dedFamRem": 5956.09,
        "oopFamRem": 5956.09,
        "allowedAmt": [
            {
                "serviceId": "5b550cad3c5edb1da5e2bba6",
                "POS": "Hospital Outpatient",
                "serviceCost": 2000,
                "benefitType": "coins",
                "benefitValue": 0.4,
                "label": "Low",
                "oop": "2000.00",
                "narrative": "For Knee Arthroscopy (Facility), your individual deductible is greater then service cost, your OOP cost is the cost of the service $2000"
            },
            {
                "serviceId": "5b550cad3c5edb1da5e2bba6",
                "POS": "Hospital Outpatient",
                "serviceCost": 4000,
                "benefitType": "coins",
                "benefitValue": 0.4,
                "label": "Average",
                "oop": "3390.14",
                "narrative": "For Knee Arthroscopy (Facility), your OOP cost is your remaining individual deductible, $2983.57 plus coinsurance of 40% over the remaining $1016.43"
            },
            {
                "serviceId": "5b550cad3c5edb1da5e2bba6",
                "POS": "Hospital Outpatient",
                "serviceCost": 6000,
                "benefitType": "coins",
                "benefitValue": 0.4,
                "label": "High",
                "oop": "4190.14",
                "narrative": "For Knee Arthroscopy (Facility), your OOP cost is your remaining individual deductible, $2983.57 plus coinsurance of 40% over the remaining $3016.43"
            }
        ]
```
