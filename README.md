# OOP-Widget
Out of Pocket cost widget
## Introduction

This project is a Out of Pocket Flex Connector for connecting to Rapid Health collection and insurance plan information.

The calculator will take into account the member's insurance plan benefits and the user's accumulated benefits to provide an out-of-pocket cost estimate. This break-down will then be displayed in the mobile app.


## Installation

To use this widget, clone this GitHub repository, and install the associated dependencies:

```npm install```

```npm install -g kinvey-cli```

The DLC can either be deployed to the FlexService Runtime, or run locally.  To run locally, you must have node.js
v6.x or greater.  Execute:

```node .```

Create a flex service Internal OOP, then deploy to Kinvey Flex container:
  Execute:

```npm run deploy```

> oop-flex-reference@0.1.0 deploy /Users/ronaldheiney/OOP-Widget
> npm version --no-git-tag-version patch && kinvey flex deploy

v0.1.1
Deploy initiated. Job: 0dabb32b8f24434a991912804beb7647

```npm run status```

Job status: ACTIVE - Building image.
key      value                           
-------  --------------------------------
status   NEW                             
version                                  
id       dab03b8e52c748b1b05c625c5fd8b97e
name     Internal OOP                    


## Dependencies

This OOP Flex Connector uses the following dependencies, in addition to the `kinvey-flex-sdk`:

Collections

* *user:* The user collection the first_name, last_name, dateOfBirth, memberId, planID, provider, payerName "pokitdok id"
* *health-plan:* Health plan 
* *eligibilty:* Rapid Health eligibility "Pokitdoc"
* *benefit-plan:* Benefit information
* *service-cost:* Service cost information
* *oop:* Out of pocket widget service, create collection and assign to Internal OOP "oop data service" 
* *service:* Service cost wrapper service, create collection and assign to Internal OOP "service data service"



