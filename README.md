# OOP-Widget
Out of Pocket cost widget
## Introduction

This project is a Out of Pocket Flex Connector for connecting to Rapid Health collection and insurance plan information.

The calculator will take into account the member's insurance plan benefits and the user's accumulated benefits to provide an out-of-pocket cost estimate. This break-down will then be displayed in the mobile app.


## Installation

To use this wiget, clone this GitHub repository, and install the associated dependencies:

```npm install```

```npm install -g kinvey-cli```

The DLC can either be deployed to the FlexService Runtime, or run locally.  To run locally, you must have node.js
v6.x or greater.  Execute:

```node .```

To deploy to Kinvey Flex container:
  Execute:

```npm run deploy```

## Dependencies

This OOP Flex Connector uses the following dependencies, in addition to the `kinvey-flex-sdk`:

Collections
* *user:* The user collection the first_name, last_name, dateOfBirth, memberId, planID, provider, 
* *health-plan:* Health plan 
* *benefit-plan:* Benefit information
* *service-cost* Service cost information
* *oop* Out of pocket widget service 
* *service* Service cost wrapper service

