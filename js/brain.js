/**
 * The file contains solely the Q-learning model for training our flappy bird.
 * It takes input from the environment such as the position of the flappy bird,
 * the tubes etc and responds back with the appropriate action to take.
 * 
 * Author @nellex
 */


/**
 * The Q-table forms the heart of the Q-learning algorithm. Maintained for our
 * agent Flappy bird, the table represents the state-action function, i.e. the
 * relationship between a set of states (S) and the set of actions (A) =>
 * Q[S,A]. For a given state 's' and a given action 'a', Q(s,a) denotes the
 * expected reward of doing the action 'a' in the state 's'.
 * 
 * In our learning model, the state of the environment is defined by: 
 * (1) speedY: The speed of the flappy bird in the Y-axis, i.e. by what rate the
 * bird is going up or falling down
 * (2) tubeX: The X-coordinate of the next incoming tube, i.e. how far the next 
 * tube is from the flappy bird 
 * (3) diffY: We define the ideal position from which the flappy bird should pass 
 * through to be the very middle of vertical space between the two tubes. The 
 * parameter 'diffY' denotes the difference between the Y-coordinate of the flappy 
 * bird to the Y-coordinate of our ideal passage position, i.e. how down below or 
 * above our flappy bird is from where it should pass from the tube.
 */
var Q_table = {};

/** 
 * The action set comprises of: 
 * (1) Stay: Take no action, and just go with the flow of the gravity 
 * (2) Jump: Push the flappy bird upwards
 */
var actionSet = {
  STAY : 0,
  JUMP : 1
};

/**
 * Defining the parameters for our Q-learning model, 
 * (1) Learning rate, alpha: Ranging between [0,1], it determines how quickly should 
 * the flappy bird override it's old learned actions with the new ones for the 
 * corresponding state
 * (2) Discount factor, gamma: Used for determining the importance of future reward. 
 * 
 * In our game, if the flappy bird fails to clear the tube, the action which it 
 * took recently previously will be penalized more than the action which it took 10 
 * steps ago. This is because it's the recent actions which has a more influence on 
 * the success of the bird.
 */
var gamma = 0.8; // Discounted rewards
var alpha = 0.1; // Learning rate

// Frame buffer for mainting the state-action pairs in the current episode
var frameBuffer = [];

// Number of frames in the current frame buffer
var episodeFrameCount = 0;

// Flag to determine if the current episode is still ongoing or is completed by
// maintaing a index to the next incoming tube
var targetTubeIndex;

// The tube which the bird must clear next
var targetTube;

// To maintain the count on the number of trials
var trials = 0;

/**
 * Function to lookup the estimated Q-value (reward) in the Q-table for a given
 * state-action pair
 * @param {*} state State of the environment as described above
 * @param {*} action The action to be taken
 */
function getQ(state, action) {
  var config = [ state.diffY, state.speedY, state.tubeX, action ];
  if (!(config in Q_table)) {
     // If there's no entry in the given Q-table for the given state-action
     // pair, return a default reward score as 0
     return 0;
  }
  return Q_table[config];
}

/**
 * Function to update the Q-value (reward) entry for the given state-action pair
 * @param {*} state The state of the environment
 * @param {*} action The action taken for the given state
 * @param {*} reward The reward to be awarded for the state-action pair 
 */
function setQ(state, action, reward) {
  var config = [ state.diffY, state.speedY, state.tubeX, action ];
  if (!(config in Q_table)) {
    Q_table[config] = 0;
  }
  Q_table[config] += reward;
}

/**
 * Function responsible for selecting the appropriate action corresponding to
 * the given state The action which has a higher Q-value for the given state is
 * 'generally' executed 
 * @param {*} state 
 */
function getAction(state) {
  // Why always follow the rules? Once in a while (1/100000), our flappy bird
  // takes a random decision without looking up the Q-table to explore a new
  // possibility. This is to help the flappy bird to not get stuck on a single
  // path.
  var takeRandomDecision = Math.ceil(Math.random() * 100000)%90001;
  if (takeRandomDecision == 0) {
    console.log("Going random baby!");
    // 1 out of 4 times, it'll take a decision to jump
    var shouldJump = ((Math.random() * 100 )%4 == 0);
    if (shouldJump) {
        return actionSet.JUMP;
    } else {
        return actionSet.STAY;
    }
  }
  
  // Lookup the Q-table for rewards corresponding to Jump and Stay action for
  // the given state
  var rewardForStay = getQ(state, actionSet.STAY);
  var rewardForJump = getQ(state, actionSet.JUMP);

  if (rewardForStay > rewardForJump) {
    // If reward for Stay is higher, command the flappy bird to stay
    return actionSet.STAY;
  } else if (rewardForStay < rewardForJump) {
    // If reward for Jump is higher, command the flappy bird to jump
    return actionSet.JUMP;
  } else {
    // This is the case when the reward for both the actions are the same In
    // such a case, we determine randomly the action to be taken Generally, the
    // probability of jumping is lower as compared to stay to mimic the natural
    // scenario We press jump much less occasionally than we let the flappy bird
    // fall
    var shouldJump = (Math.ceil( Math.random() * 100 )%25 == 0); 
    if (shouldJump) {
        return actionSet.JUMP;
    } else {
        return actionSet.STAY;
    }    
  }
}

/**
 * Function responsible for rewarding the flappy bird according to its
 * performance One thing to note here is that we found the behaviour of our
 * Flappy Bird to be highly episodic. As soon as your flappy bird clears one
 * obstacle, we terminate our episode there and then and reward it postively A
 * new episode is then started for the next obstacle i.e. the next tube which is
 * treated completely independent from the previous one
 * 
 * We reward the flappy bird at the end of an episode, hence we maintain a frame
 * buffer to store the state-action pairs in a sequential order and decide upon
 * the reward to be awarded for that state-action on the completion of the
 * episode
 * @param {*} reward The amound of reward to be awarded to the Flappy Bird
 * @param {*} wasSuccessful Determines if the reward to be awarded should be
 * negative or positive depending upon if the episode was completed successfully
 * or not
 */
function rewardTheBird(reward, wasSuccessful) {
  // Minumun number of frames to be maintained in the frame buffer for the
  // episode (for maintaining the state-action sequecne tail)
  var minFramSize = 5;
  // Tolerable deviation from the ideal passage position between the tubes in px
  var theta = 1;
  
  var frameSize = Math.max(minFramSize, episodeFrameCount);
    
  // Iterate over the state-action sequence trail, from the most recent to the
  // most oldest
  for (var i = frameBuffer.length-2; i >= 0 && frameSize > 0; i--) {
    var config = frameBuffer[i];
    var state  = config.env;
    var action = config.action;
    
    // The reward for the state is influenced by how close the flappy bird was
    // from the ideal passage position
    var rewardForState = (reward - Math.abs(state.diffY));
    
    // Determine if the reward for given state-action pair should be positive or
    // negative
    if (!wasSuccessful) {
      if (state.diffY >= theta && action == actionSet.JUMP) {
        // If the bird was above the ideal passage position and it still decided
        // to jump, reward negatively
        rewardForState = -rewardForState;
      } else if(state.diffY <= -theta && action == actionSet.STAY) {
        // If the bird was below the ideal passage position and it still decided
        // to not jump (stay), reward negatively
        rewardForState = -rewardForState;
      } else {
        // The bird took the right decision, so don't award it negatively
        rewardForState = +0.5;
      }
    }
    
    // Update the Q-value for the state-action pair according to the Q-learning
    // algorithm Ref: https://en.wikipedia.org/wiki/Q-learning
    var futureState = frameBuffer[i+1].env;
    var optimalFutureValue = Math.max(getQ(futureState, actionSet.STAY), 
                                      getQ(futureState, actionSet.JUMP));
    var updateValue = alpha*(rewardForState + gamma * optimalFutureValue - getQ(state, action));

    setQ(state, action, updateValue)
    frameSize--;
 }
 // Allocating reward is complete, hence clear the frame buffer but still try to
 // maintain the most recent 5 state-action pair Since the last actions taken in
 // the previous episode affects the position of the bird in the next episdoe
 frameBuffer = frameBuffer.slice(Math.max(frameBuffer.length-minFramSize, 1));
 episodeFrameCount = 0;
}

/**
 * Function to negatively reward the flappy bird when the game is over
 */
function triggerGameOver() {
  var reward =  100;
  rewardTheBird(reward, false);
  console.log( "GameOver:", score, Object.keys(Q_table).length, trials );

  // Reset the episode flag
  targetTubeIndex = -1;
  episodeFrameCount = 0;
  trials++;
}

/**
 * This function is executed for every step in the game and is responsible for
 * forming the state and delegating the action to be taken back to our flappy
 * bird
 */
function nextStep() {
  // If the game hasn't started yet then do nothing
  if (gameState != GAME)
   return;
  
  // Logic to determine if the Flappy Bird successfully surpassed the tube The
  // changing of the targetTubeIndex denotes the completion of an episode
  if (birdX < tubes[0].x + 3 && (tubes[0].x < tubes[1].x || tubes[1].x + 3 < birdX)) {
    targetTube = tubes[0];
    if (targetTubeIndex == 1) {
      // The target tube changed from [1] to [0], which means the tube[1] was
      // crossed successfully Hence reward the bird positively 
      rewardTheBird(5, true);
    }
    targetTubeIndex = 0;
  } else  {
    targetTube = tubes[1];
    if (targetTubeIndex == 0) {
      // The target tube changed from index [0] to [1], which means the tube[0]
      // was crossed successfully Hence reward the bird positively
      rewardTheBird(5, true);
    }
    targetTubeIndex = 1;
  }
  
  // We'll take no action if the  tube is too far from the bird
  if (targetTube.x - birdX > 28) {
    return;
  }

  // Else, we'll form our state from the current environment parameters to be
  // ingested by our algorithm
  var state = {
    speedY: Math.round(birdYSpeed * 100),
    tubeX: targetTube.x,
    diffY: (targetTube.y+17+6) - (birdY+1)
  };
  
  // Query the Q-table to determine the appropriate action to be taken for the
  // current state
  var actionToBeTaken = getAction(state);

  // Push the state-action pair to the frame buffer so what we can determine the
  // reward for it later on
  var config = {
    env: state,
    action: actionToBeTaken
  };  
  frameBuffer.push(config);
  episodeFrameCount++;

  // Delegate the action to our flappy bird
  if (actionToBeTaken == actionSet.JUMP) {
    birdYSpeed = -1.4;
  } else {
      // For stay action, we do nothing but just let the bird go down due to
      // gravity
  }  
}