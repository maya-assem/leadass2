import fetch from 'node-fetch';

const BITRIX_URL = process.env.BITRIX24_WEBHOOK_URL;

// Helper function to make Bitrix24 API calls
async function callBitrix(method, params = {}) {
  const url = `${BITRIX_URL}/${method}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    throw new Error(`Bitrix24 API error: ${response.statusText}`);
  }
  
  return await response.json();
}

// Get clocked-in agents
async function getClockedInAgents() {
  try {
    // Get all users (you may need to adjust the filter based on your Bitrix24 setup)
    const result = await callBitrix('user.get', {
      FILTER: {
        ACTIVE: true,
        // Add any additional filters for agents
      }
    });
    
    // Log the users we found
    console.log('Found active users:', result.result.map(user => ({
      ID: user.ID,
      NAME: `${user.NAME} ${user.LAST_NAME}`,
    })));
    
    return result.result;
  } catch (error) {
    console.error('Error getting clocked-in agents:', error);
    return [];
  }
}

// Get leads assigned to an agent
async function getAgentLeadCount(agentId) {
  try {
    const result = await callBitrix('crm.deal.list', {
      filter: {
        ASSIGNED_BY_ID: agentId,
        STAGE_ID: 'NEW' // Adjust this to match your "lead" stage ID
      },
      select: ['ID']
    });
    
    return result.result.length;
  } catch (error) {
    console.error(`Error getting lead count for agent ${agentId}:`, error);
    return 0;
  }
}

// Find agent with least leads
async function findLeastLoadedAgent(agents) {
  let leastLoaded = null;
  let minLeads = Infinity;
  
  for (const agent of agents) {
    const leadCount = await getAgentLeadCount(agent.ID);
    console.log(`Agent ${agent.NAME} ${agent.LAST_NAME} has ${leadCount} leads`);
    
    if (leadCount < minLeads) {
      minLeads = leadCount;
      leastLoaded = agent;
    }
  }
  
  return leastLoaded;
}

// Assign lead to agent
async function assignLeadToAgent(leadId, agentId) {
  try {
    const result = await callBitrix('crm.deal.update', {
      id: leadId,
      fields: {
        ASSIGNED_BY_ID: agentId
      }
    });
    
    return result.result;
  } catch (error) {
    console.error('Error assigning lead:', error);
    return false;
  }
}

// Main function to test the system
async function main() {
  try {
    // 1. Get clocked-in agents
    console.log('Getting clocked-in agents...');
    const agents = await getClockedInAgents();
    
    if (agents.length === 0) {
      console.log('No agents available');
      return;
    }
    
    // 2. Find agent with least leads
    console.log('Finding least loaded agent...');
    const leastLoadedAgent = await findLeastLoadedAgent(agents);
    
    if (!leastLoadedAgent) {
      console.log('Could not determine least loaded agent');
      return;
    }
    
    console.log('Least loaded agent:', {
      ID: leastLoadedAgent.ID,
      NAME: `${leastLoadedAgent.NAME} ${leastLoadedAgent.LAST_NAME}`,
    });
    
    // 3. For testing: Get a recent lead to assign
    const recentLeads = await callBitrix('crm.deal.list', {
      filter: {
        STAGE_ID: 'NEW',
        ASSIGNED_BY_ID: 0 // Unassigned leads
      },
      select: ['ID', 'TITLE']
    });
    
    if (recentLeads.result.length > 0) {
      const lead = recentLeads.result[0];
      console.log('Found unassigned lead:', lead);
      
      // 4. Assign the lead
      const assigned = await assignLeadToAgent(lead.ID, leastLoadedAgent.ID);
      if (assigned) {
        console.log(`Successfully assigned lead ${lead.ID} to agent ${leastLoadedAgent.ID}`);
      }
    } else {
      console.log('No unassigned leads found');
    }
    
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the main function
main();


