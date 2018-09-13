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

function coreAlgo(coverageLevel, dedIndRem, oopIndRem, dedFamRem, oopFamRem, dedIndLimit, oopFamLimit, serviceCost, benefitType, benefitValue, service, previousCost) {
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
    return ({ oop: 0, breakdown: `For ${service}, your out of pocket maximums has been met, your cost will be $0.` });
  }

  // if out of pockets are met, cost is zero
  if (coverageLevel === 'family' && (oopIndRem === 0 || oopFamRem === 0)) {
    return ({ oop: 0, breakdown: `For ${service}, your out of pocket maximums has been met, your cost will be $0.` });
  }
  

  if (benefitType.toLowerCase() === 'copay') {
    return ({ oop: benefitValue, breakdown: `For ${service}, you will have to pay your copay of $${benefitValue}.` });
  }

  // for copay_ad and coins, first check which deductible (ind or family) is lowest, so will be met first
  let controllingDedType;
  let dedRemaining;
  let oopRemaining;
  let coinsFraction;
  let coinsReadable;
  let oop = -1;
  let breakdown = 'Unknown benefit type';
  
  if (oopFamLimit === 0) {
    controllingDedType = 'individual';
    dedRemaining = dedIndRem;
    oopRemaining = oopIndRem;
  } else {
    controllingDedType = 'family';
    if (dedIndRem < dedFamRem) {
      dedRemaining = dedIndRem;
    } else {
      dedRemaining = dedFamRem;
    }
    if (oopIndRem < oopFamRem) {
      oopRemaining = oopIndRem;
    } else {
      oopRemaining = oopFamRem;
    }   
  }
  console.log('deductibles', controllingDedType, dedRemaining, oopRemaining);
  
  // adding check agains oop max, this was not in the original algorithmn 
  if (benefitType.toLowerCase() === 'copayad') {
    if (dedRemaining === 0) { // which means _both_ ind and fam deductibles are 0, so benefits kick in
      oop = benefitValue;
      breakdown = `For ${service}, your deductible has been met and you will pay your copay of $${oop.toFixed(0)}.`;
    } else if (serviceCost > dedRemaining) { // patient has to be his full service cost up to the remaining deductbile. we will charge a copay
      oop = dedRemaining + benefitValue;
      breakdown = `For ${service}, your remaining deductible is less than the contracted rate of $${serviceCost}, you will pay your remaining deductible of $${oopRemaining.toFixed(0)} plus your copay of $${benefitValue.toFixed(0)}. You will pay $${oop.toFixed(0)}`;
    } else if (serviceCost > oopRemaining) { // serviceCost<=dedRemaining
      oop = oopRemaining;
      breakdown = `For ${service}, you will meet your out of pocket maximum. You will pay your remaining out of pocket of $${oop.toFixed(0)}.`;
    } else {
      oop = serviceCost;
      breakdown = `For ${service}, you will pay the contracted rate of $${serviceCost}, as your deuctable will not be met.`;
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
      oop = serviceCost * coinsFraction;
      if (oop > oopRemaining) {
        oop = oopRemaining;
        breakdown = `For ${service}, you will meet your out of pocket maximum. You will pay your remaining out of pocket of $${oop.toFixed(0)}.`;
      } else {
        breakdown = `For ${service}, your deductible has been met and you owe ${coinsReadable}% of the $${serviceCost} contracted rate. You will have to pay $${oop.toFixed(0)} ( $${serviceCost} x ${coinsReadable}% ) = $${oop.toFixed(0)}.`;
      }
    } else if (serviceCost > dedRemaining) {
      oop = dedRemaining + ((serviceCost - dedRemaining) * coinsFraction);
      if (oop > oopRemaining) {
        oop = oopRemaining;
        breakdown = `For ${service}, you will meet your out of pocket maximum. You will pay your remaining out of pocket of $${oop.toFixed(0)}.`;
      } else {
        breakdown = `For ${service}, your remaining deductible of $${dedRemaining.toFixed(0)} is less than the contracted rate of $${serviceCost}. You owe your remaining deductible of $${dedRemaining.toFixed(0)} plus ${coinsReadable}% of the $${(serviceCost - dedRemaining).toFixed(0)} remaining contracted rate. You will pay $${oop.toFixed(0)} [ $${dedRemaining.toFixed(0)} + ( $${(serviceCost - dedRemaining).toFixed(0)} x ${coinsReadable}% = $${oop.toFixed(0)} ].`;
      }
    } else // service_cost <= ded_remaining
    if (serviceCost > oopRemaining) {
      oop = oopRemaining;
      breakdown = `For ${service}, you will meet your out of pocket maximum. You will pay your remaining out of pocket of $${oop.toFixed(0)}.`;
    } else {
      oop = serviceCost;
      breakdown = `For ${service}, you will have to pay the contracted rate of $${oop.toFixed(0)}, as your deductible will not be met.`;
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
    oop = serviceCost * coinsFraction;
    breakdown = `For ${service}, you owe ${coinsReadable}% of the $${serviceCost} contracted rate. You will have to pay $${oop.toFixed(0)} ( $${serviceCost} x ${coinsReadable}% ) = $${oop.toFixed(0)}.`;
    if (oop > oopRemaining) {
      oop = oopRemaining;
      breakdown = `For ${service}, you will meet your out of pocket maximum. You will pay your remaining out of pocket of $${oop.toFixed(0)}.`;
    } 
  }
  return ({ oop, breakdown });
}

const calculateOop = (query, modules) => {
  return new Promise((resolve, reject) => {
    console.log(`entering main algo for user ${modules.requestContext.getAuthenticatedUsername()}`);
    console.log('calculate Oop query', query);
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
    let correlationId;
    let episodeData;

    const userId = modules.requestContext.getAuthenticatedUserId();
    const serviceId = JSON.parse(query).service_id;
    const episode = JSON.parse(query).episode_name;
    const category = JSON.parse(query).category_name;
    let payerName = JSON.parse(query).trading_partner_id;
    
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
        console.log('query episode', query);
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
        console.log('query plan', query);
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
        console.log('query benefit', query);
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
        let pn = 'MOCKPAYER';

        if (user.payerName && user.payerName !== '' && user.payerName !== undefined) {
          payerName = user.payerName
        }

        if (payerName === undefined || payerName === '') {
          if (user.planProvider === 'HN') {
            pn = 'health_net_ca';
          } else if (user.planProvider === 'UHC') {
            pn = 'united_health_care';        
          } else if (user.planProvider === 'WHA') {
            pn = 'western_health_advantage';     
          }
        } else {
          pn = payerName;
        }
 
        const body = {    
          member: {
            birth_date: user.dateOfBirth,
            first_name: user.first_name,
            last_name: user.last_name,
            id: user.memberId
          },
          trading_partner_id: pn, // 'MOCKPAYER'
          provider: {
            organization_name: 'BAY AREA ACCOUNTABLE CARE NETWORK, INC',
            npi: '1093167835'
          }
        };
        console.log('eligibilty body', body);
        eligibility.getDeductibles('OOP', { body }, modules, (err, result) => {
          if (err) {
            return reject(err);
          }         
          return resolve(result);
        });
      });
    };
    
    //const res = [];
    const runCalc = (serviceId, costTable) => {
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
            // for each cost column, run the main algo
            benefit.allowed_amount.forEach((facility, index) => {
              let previousCost = 0;
              console.log('facility', facility);
              const serviceCost = facility.value;
              // accumulate the previous cost
              if (costTable === undefined || costTable[0] === undefined) {
                previousCost = 0;
              } else {
                costTable.forEach((costData) => {
                  const cost = Number.parseInt(costData.allowedAmt[index].oop);
                  previousCost += cost;
                });    
              }
              // execute main algo
              const oopResult = coreAlgo(coverageLevel, dedIndRem, oopIndRem, dedFamRem, oopFamRem, dedIndLimit, oopFamLimit, serviceCost, benefitType, benefitValue, service, previousCost); 
              rv.push({
                serviceId, POS, serviceCost, benefitType, benefitValue, label: facility.label, oop: oopResult.oop.toFixed(0), narrative: oopResult.breakdown 
              });
            });
            const cost = {
              episode,
              episodeDesc,
              service,
              correlationId,
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
            console.log('runcalc error', error);
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
      return getUserInfo(userId);
    }).then((userData) => {
      user = userData;
      console.log('User:', user);
      return getEligData(user);
    }).then((pd) => {
      console.log('Pokitdok:', pd);
      dedIndRem = Number(pd.individual_remaining_deductible).toFixed(0);
      oopIndRem = Number(pd.individual_remaining_oop).toFixed(0);
      dedFamRem = Number(pd.family_remaining_deductible).toFixed(0);
      oopFamRem = Number(pd.family_remaining_oop).toFixed(0);
      dedIndLimit = Number(pd.individual_limit_deductible).toFixed(0);
      oopIndLimit = Number(pd.individual_limit_oop).toFixed(0);
      dedFamLimit = Number(pd.family_limit_deductible).toFixed(0);
      oopFamLimit = Number(pd.family_limit_oop).toFixed(0);
      coverageLevel = pd.coverage_level;
      correlationId = pd.correlation_id;
      return runCalc(episodeData[0]._id);
    })
      .then((costData) => {
        console.log('costData', costData);
        costData.allowedAmt.forEach((facility) => {
          let narrative2;
          if (dedFamLimit > 0) {
            narrative2 = `After subtracting $${facility.oop}, your assumed remaining deductible is $${Math.max(0, costData.dedIndRem - facility.oop).toFixed(0)} and assumed remaining out of pocket maximum is $${Math.max(0, costData.oopIndRem - facility.oop).toFixed(0)}.`;
          } else {
            narrative2 = `After subtracting $${facility.oop}, your assumed remaining out of pocket maximum is $${Math.max(0, costData.oopIndRem - facility.oop).toFixed(0)}.`;
          }
          facility.narrative2 = narrative2;
          console.log('facility', facility);
        });
        costTable.push(costData);
        return (episodeData[1]) ? runCalc(episodeData[1]._id, costTable) : 0;
      })
      .then((costData) => {
        console.log('costData', costData);
        if (costData === 0) {
          return 0;
        }
        costData.allowedAmt.forEach((facility, index) => {
          const oopacc = costTable[0].allowedAmt[index];
          let narrative2;
          if (dedFamLimit > 0) {
            narrative2 = `After subtracting $${facility.oop}, your assumed remaining deductible is $${Math.max(0, costData.dedIndRem - oopacc.oop - facility.oop).toFixed(0)} and assumed remaining out of pocket maximum is $${Math.max(0, costData.oopIndRem - oopacc.oop - facility.oop).toFixed(0)}.`;
          } else {
            narrative2 = `After subtracting $${facility.oop}, your assumed remaining out of pocket maximum is $${Math.max(0, costData.oopIndRem - oopacc.oop - facility.oop).toFixed(0)}.`;
          }
          facility.narrative2 = narrative2;
          console.log('facility', facility);
        });
        costTable.push(costData);
        // Need to accumulate allowedAmt from the previous 2 items
        return (episodeData[2]) ? runCalc(episodeData[2]._id, costTable) : 0;
      })
      .then((costData) => {
        console.log('costData', costData);
        if (costData !== 0) {
          costData.allowedAmt.forEach((facility, index) => {
            const oopacc0 = costTable[0].allowedAmt[index];
            const oopacc1 = costTable[1].allowedAmt[index];
            let narrative2;
            if (dedFamLimit > 0) {
              narrative2 = `After subtracting $${facility.oop}, your assumed remaining deductible is $${Math.max(0, costData.dedIndRem - oopacc0.oop - oopacc1.oop - facility.oop).toFixed(0)} and assumed remaining out of pocket maximum is $${Math.max(0, costData.oopIndRem - oopacc0.oop - oopacc1.oop - facility.oop).toFixed(0)}.`;
            } else {
              narrative2 = `After subtracting $${facility.oop}, your assumed remaining out of pocket maximum is $${Math.max(0, costData.oopIndRem - oopacc0.oop - oopacc1.oop - facility.oop).toFixed(0)}.`;
            }
            facility.narrative2 = narrative2;
            console.log('facility', facility);
          });
          costTable.push(costData);
        }  
        let totalLow;
        let totalAverage;
        let totalHigh;
        let narrative1;
        let narrative2;
        let narrative3;
        if (costTable[1] === undefined) {
          totalLow = +costTable[0].allowedAmt[0].oop;
          narrative1 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[0].oop}`;
          totalAverage = +costTable[0].allowedAmt[1].oop;
          narrative2 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[1].oop}`;
          totalHigh = +costTable[0].allowedAmt[2].oop;
          narrative3 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[2].oop}`;
        } else if (costTable[2] === undefined) {
          totalLow = +costTable[0].allowedAmt[0].oop + +costTable[1].allowedAmt[0].oop;
          narrative1 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[0].oop} + $${costTable[1].allowedAmt[0].oop} = $${totalLow.toFixed(0)}`;
          totalAverage = +costTable[0].allowedAmt[1].oop + +costTable[1].allowedAmt[1].oop;
          narrative2 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[1].oop} + $${costTable[1].allowedAmt[1].oop} = $${totalAverage.toFixed(0)}`;
          totalHigh = +costTable[0].allowedAmt[2].oop + +costTable[1].allowedAmt[2].oop;
          narrative3 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[2].oop} + $${costTable[1].allowedAmt[2].oop} = $${totalHigh.toFixed(0)}`;
        } else {
          totalLow = +costTable[0].allowedAmt[0].oop + +costTable[1].allowedAmt[0].oop + +costTable[2].allowedAmt[0].oop;
          narrative1 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[0].oop} + $${costTable[1].allowedAmt[0].oop} + $${costTable[2].allowedAmt[0].oop} = $${totalLow.toFixed(0)}`;
          totalAverage = +costTable[0].allowedAmt[1].oop + +costTable[1].allowedAmt[1].oop + +costTable[2].allowedAmt[1].oop;
          narrative2 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[1].oop} + $${costTable[1].allowedAmt[1].oop} + $${costTable[2].allowedAmt[1].oop} = $${totalAverage.toFixed(0)}`;
          totalHigh = +costTable[0].allowedAmt[2].oop + +costTable[1].allowedAmt[2].oop + +costTable[2].allowedAmt[2].oop;
          narrative3 = `Your total out of pocket cost estimate: $${costTable[0].allowedAmt[2].oop} + $${costTable[1].allowedAmt[2].oop} + $${costTable[2].allowedAmt[2].oop} = $${totalHigh.toFixed(0)}`;
        }
      
        const total = {
          totals: [
            {
              label: 'Low',
              oopTotal: totalLow.toFixed(0),
              narrative: narrative1
            },
            {
              label: 'Average',
              oopTotal: totalAverage.toFixed(0),
              narrative: narrative2
            },
            {
              label: 'High',
              oopTotal: totalHigh.toFixed(0),
              narrative: narrative3
            }
          ]
        };
        costTable.push(total);
        resolve(costTable);
      })
      .catch((error) => {
        console.log('oop error', JSON.stringify(error));
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
