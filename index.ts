import { RoleAssignmentData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseMod } from "@polusgg/plugin-polusgg-api/src/baseMod/baseMod";
import { PluginMetadata } from "@nodepolus/framework/src/api/plugin";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Jester } from "./src/roles/jester";
import { Sheriff } from "./src/roles/sheriff";
import { Snitch } from "./src/roles/snitch";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { Engineer } from "./src/roles/engineer";
import { Grenadier } from "./src/roles/grenadier";
import { Morphling } from "./src/roles/morphling";
import { Oracle } from "./src/roles/oracle";
import { Phantom } from "./src/roles/phantom";
import { SerialKiller } from "./src/roles/serialKiller";
import { NumberValue } from "@polusgg/plugin-polusgg-api/src/packets/root/setGameOption";

type TownOfPolusGameOptions = {
  /* Engineer */
  engineerProbability: NumberValue;
  engineerCooldown: NumberValue;

  /* Grenadier */
  grenadierProbability: NumberValue;
  grenadierCooldown: NumberValue;

  /* Jester */
  jesterProbability: NumberValue;

  /* Morphling */
  morphlingProbability: NumberValue;
  morphlingCooldown: NumberValue;

  /* Oracle */
  oracleProbability: NumberValue;
  oracleCooldown: NumberValue;
  oracleAccuracy: NumberValue;

  /* Phantom */
  phantomProbability: NumberValue;

  /* Serial Killer */
  serialKillerProbability: NumberValue;
  serialKillerCooldown: NumberValue;

  /* Sheriff */
  sheriffProbability: NumberValue;
  sheriffCooldown: NumberValue;

  /* Snitch */
  snitchProbability: NumberValue;
  remainingTasks: NumberValue;
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

  getRoles(lobby: LobbyInstance): RoleAssignmentData[] {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    return [
      {
        role: Engineer,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("engineerProbability").getValue().value),
      }, {
        role: Grenadier,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("grenadierProbability").getValue().value),
      }, {
        role: Jester,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("jesterProbability").getValue().value),
      }, {
        role: Morphling,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("morphlingProbability").getValue().value),
      }, {
        role: Oracle,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("oracleProbability").getValue().value),
      }, {
        role: Phantom,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("phantomProbability").getValue().value),
      }, {
        role: SerialKiller,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("serialKillerProbability").getValue().value),
      }, {
        role: Sheriff,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("sheriffProbability").getValue().value),
      }, {
        role: Snitch,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("snitchProbability").getValue().value),
      },
    ];
  }

  getEnabled(): boolean {
    return true;
  }

  onEnable(lobby: LobbyInstance): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    gameOptions.createOption("engineerProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("grenadierProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("jesterProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("morphlingProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("oracleProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("phantomProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("serialKillerProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("sheriffProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
    gameOptions.createOption("snitchProbability", new NumberValue(50, 10, 0, 100, false, "{0}%"));
  }

  onDisable(lobby: LobbyInstance): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    gameOptions.deleteOption("engineerProbability");
    gameOptions.deleteOption("grenadierProbability");
    gameOptions.deleteOption("jesterProbability");
    gameOptions.deleteOption("morphlingProbability");
    gameOptions.deleteOption("oracleProbability");
    gameOptions.deleteOption("phantomProbability");
    gameOptions.deleteOption("serialKillerProbability");
    gameOptions.deleteOption("sheriffProbability");
    gameOptions.deleteOption("snitchProbability");
  }

  private resolveOptionPercent(percent: number): number {
    return Math.round(percent / 100);
  }
}
