// initializer.js
const { v1p1beta1 } = require("@google-cloud/speech");
const { customClasses, phraseSets } = require("./config");

const { AdaptationClient } = v1p1beta1;

async function initializeAdaptationResources(projectId) {
  const adaptationClient = new AdaptationClient({
    apiEndpoint: "speech.googleapis.com:443",
  });

  const parent = `projects/${projectId}/locations/global`;
  const adaptationResourceNames = [];

  console.log("Initializing adaptation resources on server startup...");

  // --- Custom Classes ---
  for (const customClass of customClasses) {
    const resourceName = `${parent}/customClasses/${customClass.customClassId}`;
    try {
      await adaptationClient.getCustomClass({ name: resourceName });
      const updateRequest = {
        customClass: {
          name: resourceName,
          displayName: customClass.displayName,
          items: customClass.items,
        },
        updateMask: { paths: ["displayName", "items"] },
      };
      await adaptationClient.updateCustomClass(updateRequest);
      console.log(`Custom Class ${customClass.customClassId} updated.`);
    } catch (err) {
      if (err.code === 5) {
        const createRequest = {
          parent,
          customClassId: customClass.customClassId,
          customClass: {
            displayName: customClass.displayName,
            items: customClass.items,
          },
        };
        await adaptationClient.createCustomClass(createRequest);
        console.log(`Custom Class ${customClass.customClassId} created.`);
      } else {
        console.error(
          `Error with custom class ${customClass.customClassId}:`,
          err
        );
      }
    }
  }

  // --- Phrase Sets ---
  for (const phraseSet of phraseSets) {
    const resourceName = `${parent}/phraseSets/${phraseSet.phraseSetId}`;
    try {
      await adaptationClient.getPhraseSet({ name: resourceName });
      const updateRequest = {
        phraseSet: {
          name: resourceName,
          displayName: phraseSet.displayName,
          phrases: phraseSet.phrases,
        },
        updateMask: { paths: ["displayName", "phrases"] },
      };
      await adaptationClient.updatePhraseSet(updateRequest);
      console.log(`Phrase Set ${phraseSet.phraseSetId} updated.`);
    } catch (err) {
      if (err.code === 5) {
        const createRequest = {
          parent,
          phraseSetId: phraseSet.phraseSetId,
          phraseSet: {
            displayName: phraseSet.displayName,
            phrases: phraseSet.phrases,
          },
        };
        await adaptationClient.createPhraseSet(createRequest);
        console.log(`Phrase Set ${phraseSet.phraseSetId} created.`);
      } else {
        console.error(`Error with phrase set ${phraseSet.phraseSetId}:`, err);
      }
    }
    adaptationResourceNames.push(resourceName);
  }

  return adaptationResourceNames;
}

module.exports = { initializeAdaptationResources };
