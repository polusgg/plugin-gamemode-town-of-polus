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
import { RoleAlignment } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";

export type TownOfPolusGameOptions = {
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
  snitchRemainingTasks: NumberValue;
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
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Grenadier,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("grenadierProbability").getValue().value),
        assignWith: RoleAlignment.Impostor,
      }, {
        role: Jester,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("jesterProbability").getValue().value),
        assignWith: RoleAlignment.Neutral,
      }, {
        role: Morphling,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("morphlingProbability").getValue().value),
        assignWith: RoleAlignment.Impostor,
      }, {
        role: Oracle,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("oracleProbability").getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Phantom,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("phantomProbability").getValue().value),
        assignWith: RoleAlignment.Neutral,
      }, {
        role: SerialKiller,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("serialKillerProbability").getValue().value),
        assignWith: RoleAlignment.Neutral,
      }, {
        role: Sheriff,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("sheriffProbability").getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Snitch,
        playerCount: this.resolveOptionPercent(gameOptions.getOption("snitchProbability").getValue().value),
        assignWith: RoleAlignment.Crewmate,
      },
    ];
  }

  getEnabled(): boolean {
    return true;
  }

  async onEnable(lobby: LobbyInstance): Promise<void> {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    await Promise.all([
      gameOptions.createOption("roles", "engineerProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption("config", "engineerCooldown", new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption("roles", "grenadierProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption("config", "grenadierCooldown", new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption("roles", "jesterProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),

      gameOptions.createOption("roles", "morphlingProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption("config", "morphlingCooldown", new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption("roles", "oracleProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption("config", "oracleCooldown", new NumberValue(10, 1, 10, 60, false, "{0}s")),
      gameOptions.createOption("config", "oracleAccuracy", new NumberValue(50, 10, 0, 100, false, "{0}%")),

      gameOptions.createOption("roles", "phantomProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),

      gameOptions.createOption("roles", "serialKillerProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption("config", "serialKillerCooldown", new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption("roles", "sheriffProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption("config", "sheriffCooldown", new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption("roles", "snitchProbability", new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption("config", "snitchRemainingTasks", new NumberValue(2, 1, 0, 6, false, "{0} tasks")),
    ]);
  }

  async onDisable(lobby: LobbyInstance): Promise<void> {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    await Promise.all([
      gameOptions.deleteOption("engineerProbability"),
      gameOptions.deleteOption("engineerCooldown"),

      gameOptions.deleteOption("grenadierProbability"),
      gameOptions.deleteOption("grenadierCooldown"),

      gameOptions.deleteOption("jesterProbability"),

      gameOptions.deleteOption("morphlingProbability"),
      gameOptions.deleteOption("morphlingCooldown"),

      gameOptions.deleteOption("oracleProbability"),
      gameOptions.deleteOption("oracleCooldown"),
      gameOptions.deleteOption("oracleAccuracy"),

      gameOptions.deleteOption("phantomProbability"),

      gameOptions.deleteOption("serialKillerProbability"),
      gameOptions.deleteOption("serialKillerCooldown"),

      gameOptions.deleteOption("sheriffProbability"),
      gameOptions.deleteOption("sheriffCooldown"),

      gameOptions.deleteOption("snitchProbability"),
      gameOptions.deleteOption("snitchRemainingTasks"),
    ]);
  }

  private resolveOptionPercent(percent: number): number {
    // example input: 230%
    // split the 230% into 2 + (30%)
    // floor p/100 = 2
    // (mod p, 100) / 100 to get 0.3
    // if Math.random <= 0.3 = 1 : 0
    return Math.floor(percent / 100) + (Math.random() < ((percent % 100) / 100) ? 1 : 0);
  }
}
