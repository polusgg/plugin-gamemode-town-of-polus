import { RoleAssignmentData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { Impostor } from "@polusgg/plugin-polusgg-api/src/baseRole/impostor/impostor";
import { BaseMod } from "@polusgg/plugin-polusgg-api/src/baseMod/baseMod";
import { PluginMetadata } from "@nodepolus/framework/src/api/plugin";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Jester } from "./src/roles/jester";
import { Sheriff } from "./src/roles/sheriff";
import { Snitch } from "./src/roles/snitch";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";

type TownOfPolusGameOptions = {
  /* Engineer */
  engineerProbability: number;
  engineerCooldown: number;

  /* Grenadier */
  grenadierProbability: number;
  grenadierCooldown: number;

  /* Jester */
  jesterProbability: number;

  /* Morphling */
  morphlingProbability: number;
  morphlingCooldown: number;

  /* Oracle */
  oracleProbability: number;
  oracleCooldown: number;
  oracleAccuracy: number;

  /* Phantom */
  phantomProbability: number;

  /* Serial Killer */
  serialKillerProbability: number;
  serialKillerCooldown: number;

  /* Sheriff */
  sheriffProbability: number;
  sheriffCooldown: number;

  /* Snitch */
  snitchProbability: number;
  remainingTasks: number;
};

const pluginMetadata: PluginMetadata = {
  name: "Town Of Polus",
  version: [1, 0, 0],
  authors: [
    {
      name: "Polus.gg",
      email: "contact@polus.gg",
      website: "https://polus.gg",
    },
  ],
  description: "NodePolus plugin generated from the template repository",
  website: "https://polus.gg",
};

export default class extends BaseMod {
  constructor() {
    super(pluginMetadata);

    AssetBundle.load("TownOfPolus").then(_ => {
      this.getLogger().info("Loaded TownOfPolus AssetBundle");
    });

    // todo set task strings for all impostor and neutral types
  }

  getRoles(_lobby: LobbyInstance): RoleAssignmentData[] {
    return [
      {
        role: Jester,
        playerCount: 1,
      }, {
        role: Sheriff,
        playerCount: 1,
      }, {
        role: Snitch,
        playerCount: 1,
      }, {
        role: Impostor,
        playerCount: 1,
      },
    ];
  }

  getEnabled(): boolean {
    return true;
  }
}
