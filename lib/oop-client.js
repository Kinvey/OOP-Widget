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

const eligibility = require('./eligibility');
const costdata = require('./cost-data');
const planData = require('./plan-data');
const benefitData = require('./benefit-data');

// translation table from Pokitdok family types to either "individual" or "family"
function normalizeCoverage(pdCov) {
  if (pdCov === 'employee_and_spouse') {
    return 'family';
  }

  return 'unknown';
}

// translation table from DPM benefit type to either one of:
// cif, cif_ad, copay, copay_ad, coins
function normalizeBenefitType(type) {
  if (type === 'Coins') {
    return 'coins';
  }

  return 'unknown';
}

function coreAlgo(coverageLevel, dedIndRem, oopIndRem, dedFamRem, oopFamRem, serviceCost, benefitType, benefitValue, service) {
  // if out of pockets are met, cost is zero
  if (oopIndRem === 0 || oopFamRem === 0) {
    return ({ oop: 0, breakdown: `For ${service}, your OOP maximums are met, your cost will be $0` });
  }

  if (benefitType === 'copay') {
    return ({ oop: benefitValue, breakdown: `For ${service}, you will have to pay your copay of $${benefitValue}` });
  }

  // for copay_ad and coins, first check which deductible (ind or family) is lowest, so will be met first
  let controllingDedType;
  let dedRemaining;
  let coinsFraction;
  let coinsReadable;

  if (dedIndRem < dedFamRem) {
    controllingDedType = 'individual';
    dedRemaining = dedIndRem;
  } else {
    controllingDedType = 'family';
    dedRemaining = dedFamRem;
  }

  if (benefitType === 'copay_ad') {
    if (dedRemaining === 0) { // which means _both_ ind and fam deductibles are 0, so benefits kick in
      return ({ oop: benefitValue, breakdown: `For ${service}, your deductible has been met and you will have to pay your copay of $${benefitValue}` });
    } else if (serviceCost > dedRemaining) { // // patient has to be his full service cost up to the remaining deductbile. we will not charge a copay
      return ({ oop: dedRemaining, breakdown: `For ${service}, your OOP cost is your remaining ${controllingDedType} deductible $${dedRemaining}` });
    } // serviceCost<=dedRemaining
    return ({ oop: serviceCost, breakdown: `For ${service}, your ${controllingDedType} deductible is greater then service cost, your OOP cost is the cost of the service $${serviceCost}` }); 
  }

  if (benefitType === 'coins') {
    if (benefitValue > 1) { // if percentage [0-100], then normalize to a fraction [0-1]
      coinsFraction = benefitValue / 100;
      coinsReadable = benefitValue;
    } else { // if it's already [0-1], then increase readability
      coinsFraction = benefitValue;
      coinsReadable = benefitValue * 100;
    }

    if (dedRemaining === 0) { // which means _both_ ind and fam deductibles are 0, so benefits kick in
      return ({ oop: (serviceCost * coinsFraction), breakdown: `For ${service}, your deductibles have been met, your OOP cost is coinsurance of ${coinsReadable}% over the service cost of $${serviceCost}` });
    } else if (serviceCost > dedRemaining) { // // patient has to be his full service cost up to the remaining deductbile. we will not charge a copay
      return (
        {
          oop: (dedRemaining + ((serviceCost - dedRemaining) * coinsFraction)),
          breakdown: `For $${service}, your OOP cost is your remaining ${controllingDedType} deductible, $${dedRemaining} plus coinsurance of ${coinsReadable}% over the remaining $${(serviceCost - dedRemaining).toFixed(2)}` 
        });
    }// service_cost<=ded_remaining
    return ({ oop: serviceCost, breakdown: `For ${service}, your ${controllingDedType} deductible is greater then service cost, your OOP cost is the cost of the service $${serviceCost}` });
  }
  
  if (benefitType === 'percent') {
    if (benefitValue > 1) { // if percentage [0-100], then normalize to a fraction [0-1]
      coinsFraction = benefitValue / 100;
      coinsReadable = benefitValue;
    } else { // if it's already [0-1], then increase readability
      coinsFraction = benefitValue;
      coinsReadable = benefitValue * 100;
    }
    return ({ oop: (serviceCost * coinsFraction), breakdown: `For ${service}, your out of pocket cost is coinsurance of ${coinsReadable}% over the service cost of $${serviceCost}` });
  }
  // default
  return ({ breakdown: 'Unknown benefit type', oop: -1 });
}

const calculateOop = (query, modules) => {
  return new Promise((resolve, reject) => {
    console.log(`entering main algo for user ${modules.requestContext.getAuthenticatedUsername()}`);

    if (modules.requestContext.getSecurityContext() !== 'user') {
      return reject(new Error('must run algo in user context'));
    }

    let user;
    const userId = modules.requestContext.getAuthenticatedUserId();
    const serviceId = JSON.parse(query).service_id;
    const episode = JSON.parse(query).episode_name;
    const category = JSON.parse(query).category_name;
    
    const getServiceData = (serviceId) => {
      return new Promise((resolve, reject) => {
        costdata.getCostData('OOP', serviceId, modules, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });      
    };

    const getEpisodeData = (episode, category) => {
      return new Promise((resolve, reject) => {
        const query = {
          episode,
          category
        };
        console.log('query', query);
        costdata.getAllCostData('OOP', query, modules, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });      
    };

    const getPlanData = (user) => {
      return new Promise((resolve, reject) => {
        const query = {
          planName: user.planName,
          planId: user.planID
        };
        console.log('query', query);
        planData.getPlanData('OOP', query, modules, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });      
    };

    const getBenefitData = (user, cost) => {
      return new Promise((resolve, reject) => {
        const query = {
          provider: user.planName,
          planID: user.planID,
          benefitKey: cost.benefitKey,
          allowed_amount: cost.allowed_amount
        };
        console.log('query', query);
        benefitData.getBenefitData('OOP', query, modules, (err, result) => {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });      
    };
    
    const getUserInfo = (userId) => {
      return new Promise((resolve, reject) => {
        modules.userStore().findById(userId, (err, user) => {
          if (err) {
            return reject(err);
          }
          return resolve(user);
        });
      });
    };

    const getEligData = (user) => {
      return new Promise((resolve, reject) => {
        const body = {    
          member: {
            birth_date: user.dateOfBirth,
            first_name: user.first_name,
            last_name: user.last_name
          },
          trading_partner_id: user.payerName // 'MOCKPAYER'
        };
        eligibility.getDeductibles('OOP', { body }, modules, (err, result) => {
          if (err) {
            return reject(err);
          }         
          return resolve(result);
        });
      });
    };
    
    //const res = [];
    const runCalc = (userId, serviceId) => {
      return new Promise((resolve, reject) => {
        let benefitType;
        let benefitValue;
        let episode;
        let episodeDesc;
        let POS;
        let service;
        let coverageLevel;
        let dedIndRem;
        let oopIndRem;
        let dedFamRem;
        let oopFamRem;
        
        getUserInfo(userId).then((result) => {
          user = result;
          console.log('User:', user);
          return getEligData(user);
        }).then((pd) => {
          console.log('Pokitdok:', pd);
          dedIndRem = Number(pd.individual_remaining_deductible);
          oopIndRem = Number(pd.individual_remaining_oop);
          dedFamRem = Number(pd.family_remaining_deductible);
          oopFamRem = Number(pd.family_remaining_oop);
          coverageLevel = normalizeCoverage(pd.coverage_level);
          console.log('serviceId', serviceId);
          return getServiceData(serviceId);
        }).then((result) => {
          console.log('Service cost:', result);
          episode = result.episode;
          episodeDesc = result.episodeDesc;
          POS = result.POS;
          service = result.service;
          return getBenefitData(user, result);
        })
          .then((benefit) => {
            console.log('Benefit data:', benefit);
            benefitType = normalizeBenefitType(benefit.type);
            benefitValue = benefit.value;
            const rv = [];
            // for each cost column, run the main algo
            benefit.allowed_amount.forEach((facility) => {
              console.log('facility', facility);
              const serviceCost = facility.value;
              // execute main algo
              const oopResult = coreAlgo(coverageLevel, dedIndRem, oopIndRem, dedFamRem, oopFamRem, serviceCost, benefitType, benefitValue, service); 
              rv.push({
                serviceId, POS, serviceCost, benefitType, benefitValue, label: facility.label, oop: oopResult.oop.toFixed(2), narrative: oopResult.breakdown 
              });
            });
            const cost = {
              episode,
              episodeDesc,
              service,
              dedIndRem,
              oopIndRem,
              dedFamRem,
              oopFamRem,
              allowedAmt: rv
            };
            resolve(cost);
          })
          .catch((error) => {
            console.log('ERROR', error);
            reject(error);
          });
      });
    };
    
    //call run calc
    getEpisodeData(episode, category).then((result) => {
      console.log('get episode data', result);
      const promises = [];
      for (let i = 0; i < result.length; i += 1) {
        promises.push(runCalc(userId, result[i]._id));
      }
      Promise.all(promises)    
        .then((data) => { resolve(data); })
        .catch((err) => { reject(err); });
    });
  });
};

exports.calculateOop = (resource, query, modules, callback) => {
  calculateOop(query, modules).then((result) => {
    callback(null, result);
  }, (err) => {
    callback(err, null); 
  });
};