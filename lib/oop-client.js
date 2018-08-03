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

function coreAlgo(coverageLevel, dedIndRem, oopIndRem, dedFamRem, oopFamRem, serviceCost, benefitType, benefitValue, service, previousCost) {
  // adjust deductibles from previous remaining
  if (dedIndRem < previousCost) {
    dedIndRem = 0;
  } else {
    dedIndRem -= previousCost;
  }

  if (oopIndRem < previousCost) {
    oopIndRem = 0;
  } else {
    oopIndRem -= previousCost;
  }

  if (dedFamRem < previousCost) {
    dedFamRem = 0;
  } else {
    dedFamRem -= previousCost;
  }

  if (oopFamRem < previousCost) {
    oopFamRem = 0;
  } else {
    oopFamRem -= previousCost;
  }
  
  // if out of pockets are met, cost is zero
  if (coverageLevel === 'individual' && oopIndRem === 0) { 
    return ({ oop: 0, breakdown: `For ${service}, your OOP Maximums are met, your cost will be $0` });
  }

  // if out of pockets are met, cost is zero
  if (coverageLevel === 'family' && (oopIndRem === 0 || oopFamRem === 0)) {
    return ({ oop: 0, breakdown: `For ${service}, your OOP Maximums are met, your cost will be $0` });
  }
  

  if (benefitType.toLowerCase() === 'copay') {
    return ({ oop: benefitValue, breakdown: `For ${service}, you will have to pay your copay of $${benefitValue}` });
  }

  // for copay_ad and coins, first check which deductible (ind or family) is lowest, so will be met first
  let controllingDedType;
  let dedRemaining;
  let oopRemaining;
  let coinsFraction;
  let coinsReadable;
  let oop = -1;
  let breakdown = 'Unknown benefit type';
  
  if (coverageLevel === 'individual') {
    controllingDedType = 'individual';
    dedRemaining = dedIndRem;
    oopRemaining = oopIndRem;
  } else {
    controllingDedType = 'family';
    dedRemaining = dedFamRem;
    oopRemaining = oopFamRem;
  }
  // adding check agains oop max, this was not in the original algorithmn 
  if (benefitType.toLowerCase() === 'copay_ad') {
    if (dedRemaining === 0) { // which means _both_ ind and fam deductibles are 0, so benefits kick in
      oop = benefitValue;
      breakdown = `For ${service}, your deductible has been met and you will have to pay your copay of $${oop.toFixed(2)}`;
    } else if (serviceCost > dedRemaining) { // patient has to be his full service cost up to the remaining deductbile. we will not charge a copay
      oop = dedRemaining;
      breakdown = `For ${service}, your OOP cost is your remaining ${controllingDedType} deductible $${oop.toFixed(2)}`;
    } else if (serviceCost > oopRemaining) { // serviceCost<=dedRemaining
      oop = oopRemaining;
      breakdown = `For ${service}, your OOP Max is met, your OOP cost is remaining OOP Max $${oop.toFixed(2)}`;
    } else {
      oop = serviceCost;
      breakdown = `For ${service}, your ${controllingDedType} deductible is greater then service cost, your OOP cost is the cost of the service $${oop}`;
    }
  }

  if (benefitType.toLowerCase() === 'coins') {
    if (benefitValue > 1) { // if percentage [0-100], then normalize to a fraction [0-1]
      coinsFraction = benefitValue / 100;
      coinsReadable = benefitValue;
    } else { // if it's already [0-1], then increase readability
      coinsFraction = benefitValue;
      coinsReadable = benefitValue * 100;
    }
    // adding check agains oop max, this was not in the original algorithmn 
    if (dedRemaining === 0) { // which means _both_ ind and fam deductibles are 0, so benefits kick in
      if (serviceCost > oopRemaining) {
        oop = oopRemaining;
        breakdown = `For ${service}, your OOP Max is met, your OOP cost is remaining OOP Max $${oop.toFixed(2)}`;
      } else {
        oop = serviceCost * coinsFraction;
        breakdown = `For ${service}, your deductibles have been met, your OOP cost is coinsurance of ${coinsReadable}% over the service cost of $${serviceCost}`;
        if (oop > oopRemaining) {
          oop = oopRemaining;
          breakdown = `For ${service}, your OOP Max is met, your OOP cost is remaining OOP Max $${oop.toFixed(2)}`;
        }
      }
    } else if (serviceCost > dedRemaining) { // // patient has to be his full service cost up to the remaining deductbile. we will not charge a copay
      if (serviceCost > oopRemaining) {
        oop = oopRemaining;
        breakdown = `For ${service}, your OOP Max is met, your OOP cost is remaining OOP Max $${oop.toFixed(2)}`;
      } else {
        oop = dedRemaining + ((serviceCost - dedRemaining) * coinsFraction);
        breakdown = `For ${service}, your OOP cost is your remaining ${controllingDedType} deductible, $${dedRemaining.toFixed(2)} plus coinsurance of ${coinsReadable}% over the remaining $${(serviceCost - dedRemaining).toFixed(2)}`;
      }
    } else { // service_cost<=ded_remaining
      if (serviceCost > oopRemaining) {
        oop = oopRemaining;
        breakdown = `For ${service}, your OOP Max is met, your OOP cost is remaining OOP Max $${oop.toFixed(2)}`;
      } else {
        oop = serviceCost;
        breakdown = `For ${service}, your ${controllingDedType} deductible is greater then service cost, your OOP cost is the cost of the service $${oop.toFixed(2)}`;
      } 
    }
  }
  
  if (benefitType.toLowerCase() === 'percent') {
    if (benefitValue > 1) { // if percentage [0-100], then normalize to a fraction [0-1]
      coinsFraction = benefitValue / 100;
      coinsReadable = benefitValue;
    } else { // if it's already [0-1], then increase readability
      coinsFraction = benefitValue;
      coinsReadable = benefitValue * 100;
    }
    if (serviceCost > oopRemaining) {
      oop = serviceCost * coinsFraction;
      breakdown = `For ${service}, your OOP Max is met, your OOP cost is remaining OOP Max $${oop.toFixed(2)}`; 
    } else {
      oop = serviceCost * coinsFraction;
      breakdown = `For ${service}, your out of pocket cost is coinsurance of ${coinsReadable}% over the service cost of $${serviceCost}`;
      if (oop > oopRemaining) {
        oop = oopRemaining;
        breakdown = `For ${service}, your OOP Max is met, your OOP cost is remaining OOP Max $${oop.toFixed(2)}`;
      } 
    }
  }
  return ({ oop, breakdown });
}

const calculateOop = (query, modules) => {
  return new Promise((resolve, reject) => {
    console.log(`entering main algo for user ${modules.requestContext.getAuthenticatedUsername()}`);

    if (modules.requestContext.getSecurityContext() !== 'user') {
      return reject(new Error('must run algo in user context'));
    }

    let user;
    let dedIndRem;
    let oopIndRem;
    let dedFamRem;
    let oopFamRem;
    let dedIndLimit;
    let oopIndLimit;
    let dedFamLimit;
    let oopFamLimit;
    let coverageLevel;
    let episodeData;

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

    const getEpisodeData = (serviceId, episode, category) => {
      return new Promise((resolve, reject) => {
        const query = {
          _id: serviceId,
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
          planName: user.planProvider,
          planId: user.planCode
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
          provider: user.planProvider,
          planID: user.planCode,
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
            last_name: user.last_name,
            id: user.memberId
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
    const runCalc = (serviceId, allowedAmt) => {
      return new Promise((resolve, reject) => {
        let benefitType;
        let benefitValue;
        let episode;
        let episodeDesc;
        let POS;
        let service;
        
       
        getServiceData(serviceId).then((result) => {
          console.log('Service cost:', result);
          episode = result.episode;
          episodeDesc = result.episodeDesc;
          POS = result.POS;
          service = result.service;
          return getBenefitData(user, result);
        })
          .then((benefit) => {
            console.log('Benefit data:', benefit);
            benefitType = benefit.type;
            benefitValue = benefit.value;
            const rv = [];
            let index = 0;
            let previousCost;
            // for each cost column, run the main algo
            benefit.allowed_amount.forEach((facility) => {
              console.log('facility', facility);
              const serviceCost = facility.value;
              if (allowedAmt === undefined || allowedAmt[0] === undefined) {
                previousCost = 0;
              } else {
                previousCost = allowedAmt[index].oop;
              }
              // execute main algo
              const oopResult = coreAlgo(coverageLevel, dedIndRem, oopIndRem, dedFamRem, oopFamRem, serviceCost, benefitType, benefitValue, service, previousCost); 
              rv.push({
                serviceId, POS, serviceCost, benefitType, benefitValue, label: facility.label, oop: oopResult.oop.toFixed(2), narrative: oopResult.breakdown 
              });
              index += 1;
            });
            const cost = {
              episode,
              episodeDesc,
              service,
              dedIndRem,
              oopIndRem,
              dedFamRem,
              oopFamRem,
              dedIndLimit,
              oopIndLimit,
              dedFamLimit,
              oopFamLimit,
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
    /*    getEpisodeData(episode, category).then((result) => {
      console.log('get episode data', result);
      const promises = [];
      for (let i = 0; i < result.length; i += 1) {
        promises.push(runCalc(userId, result[i]._id));
      }
      Promise.all(promises)    
        .then((data) => { resolve(data); })
        .catch((err) => { reject(err); });
    }); */

    const costTable = [];
    getEpisodeData(serviceId, episode, category).then((result) => {
      console.log('get episode data', result);
      episodeData = result;
      return getUserInfo(userId)
    }).then((userData) => {
      user = userData;
      console.log('User:', user);
      return getEligData(user);
    }).then((pd) => {
      console.log('Pokitdok:', pd);
      dedIndRem = Number(pd.individual_remaining_deductible);
      oopIndRem = Number(pd.individual_remaining_oop);
      dedFamRem = Number(pd.family_remaining_deductible);
      oopFamRem = Number(pd.family_remaining_oop);
      dedIndLimit = Number(pd.individual_limit_deductible);
      oopIndLimit = Number(pd.individual_limit_oop);
      dedFamLimit = Number(pd.family_limit_deductible);
      oopFamLimit = Number(pd.family_limit_oop);
      coverageLevel = pd.coverage_level;
      return runCalc(episodeData[0]._id);
    })
      .then((costData) => {
        console.log('costData', costData);
        if (episodeData[1]) {
          costTable.push(costData);
        }
        return (episodeData[1]) ? runCalc(episodeData[1]._id, costData.allowedAmt) : costData;
      })
      .then((costData) => {
        console.log('costData', costData);
        costTable.push(costData);  
        let totalLow;
        let totalAverage;
        let totalHigh;
        if (costTable[1] === undefined) {
          totalLow = +costTable[0].allowedAmt[0].oop;
          totalAverage = +costTable[0].allowedAmt[1].oop;
          totalHigh = +costTable[0].allowedAmt[2].oop;
        } else {
          totalLow = +costTable[0].allowedAmt[0].oop + +costTable[1].allowedAmt[0].oop;
          totalAverage = +costTable[0].allowedAmt[1].oop + +costTable[1].allowedAmt[1].oop;
          totalHigh = +costTable[0].allowedAmt[2].oop + +costTable[1].allowedAmt[2].oop;
        }
      
        const total = {
          totals: [
            {
              label: 'Low',
              oopTotal: totalLow.toFixed(2)
            },
            {
              label: 'Average',
              oopTotal: totalAverage.toFixed(2)
            },
            {
              label: 'High',
              oopTotal: totalHigh.toFixed(2)
            }
          ]
        };
        costTable.push(total);
        resolve(costTable);
      })
      .catch((error) => {
        console.log('ERROR', error);
        reject(error);
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
