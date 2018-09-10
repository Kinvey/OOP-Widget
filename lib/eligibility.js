// /**
//  * Copyright (c) 2018 Kinvey Inc.
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
//  * in compliance with the License. You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software distributed under the License
//  * is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
//  * or implied. See the License for the specific language governing permissions and limitations under
//  * the License.
//  */

const _ = require('lodash');

const _getEligibilityService = (context, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const eligibility = store.collection('oop-eligibility');
    const body = context.body;

    eligibility.save(body, (err, result) => {
      const correlationId = (result !== undefined && result.correlation_id !== undefined) ? result.correlation_id : null;
      console.log(`correlationId = ${correlationId}`);
      if (err) {
        console.log('eligibility error', JSON.stringify(err));
        return reject(new Error(`Eligibility error, correlationId = ${correlationId}. ${JSON.stringify(err)}`));
      } 
      
      if (result === undefined) {
        console.log('eligibility error, data not returned');
        return reject(new Error('Eligibility data not returned.'));
      }

      if (result.summary === undefined) {
        if (result.reject_reason === undefined) {
          console.log('eligibility error, summary data not returned');
          return reject(new Error(`Eligibility error, summary data not returned, correlationId = ${correlationId}.`));
        }
        console.log('eligibility error, reject error', result.reject_reason);
        return reject(new Error(`Eligibility error, reject error, correlationId = ${correlationId}. ${result.reject_reason}`));
      }

      if (result.coverage.active === false) {
        console.log('eligibility error, eligibility data not valid, member not active.');
        return reject(new Error(`Eligibility error, member not active,  correlationId = ${correlationId}.`));
      }

      const coverageLevel = (result !== undefined && result.coverage !== undefined && result.coverage.deductibles !== undefined) ? result.coverage.deductibles[0].coverage_level : null;
      const indDed = (result !== undefined !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.individual !== undefined) ? result.summary.deductible.individual.in_network.remaining.amount : null;
      const indOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.individual !== undefined) ? result.summary.out_of_pocket.individual.in_network.remaining.amount : null;
      const famDed = (result !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.family !== undefined) ? result.summary.deductible.family.in_network.remaining.amount : null;
      const famOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.family !== undefined) ? result.summary.out_of_pocket.family.in_network.remaining.amount : null;
      const indLimitOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.individual !== undefined) ? result.summary.out_of_pocket.individual.in_network.limit.amount : null;
      const famLimitOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.family !== undefined) ? result.summary.out_of_pocket.family.in_network.limit.amount : null;
      const indLimitDed = (result !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.individual !== undefined) ? result.summary.deductible.individual.in_network.limit.amount : null;
      const famLimitDed = (result !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.family !== undefined) ? result.summary.deductible.family.in_network.limit.amount : null;
  
      const deductibles = {
        coverage_level: coverageLevel,
        individual_remaining_deductible: indDed,
        individual_remaining_oop: indOOP,
        family_remaining_deductible: famDed,
        family_remaining_oop: famOOP,
        individual_limit_oop: indLimitOOP,
        family_limit_oop: famLimitOOP,
        individual_limit_deductible: indLimitDed,
        family_limit_deductible: famLimitDed,
        correlation_id: correlationId
      };

      return resolve(deductibles);
    });
  });
};

exports.getDeductibles = (resource, context, modules, callback) => {
  _getEligibilityService(context, modules)
    .then((result) => {
      callback(null, result);
    })
    .catch((error) => {
      callback(error, null);
    });
};
