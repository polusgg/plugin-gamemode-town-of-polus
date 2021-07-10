import { RoleAssignmentData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseMod } from "@polusgg/plugin-polusgg-api/src/baseMod/baseMod";
import { PluginMetadata } from "@nodepolus/framework/src/api/plugin";
import { LobbyInstance } from "@nodepolus/framework/src/api/lobby";
import { Jester } from "./src/roles/jester";
import { Sheriff } from "./src/roles/sheriff";
import { Snitch } from "./src/roles/snitch";
import { AssetBundle } from "@nodepolus/framework/src/protocol/polus/assets";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { Engineer } from "./src/roles/engineer";
import { Grenadier } from "./src/roles/grenadier";
// import { Morphling } from "./src/roles/morphling";
import { Oracle } from "./src/roles/oracle";
import { Phantom } from "./src/roles/phantom";
import { SerialKiller } from "./src/roles/serialKiller";
import { NumberValue } from "@nodepolus/framework/src/protocol/polus/packets/root/setGameOption";
import { RoleAlignment } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { TownOfPolusGameOptionCategories, TownOfPolusGameOptionNames } from "./src/types";

export type TownOfPolusGameOptions = {
  /* Engineer */
  [TownOfPolusGameOptionNames.EngineerProbability]: NumberValue;

  /* Grenadier */
  [TownOfPolusGameOptionNames.GrenadierProbability]: NumberValue;
  [TownOfPolusGameOptionNames.GrenadierCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.GrenadierRange]: NumberValue;
  [TownOfPolusGameOptionNames.GrenadierBlindness]: NumberValue;

  /* Jester */
  [TownOfPolusGameOptionNames.JesterProbability]: NumberValue;

  /* Morphling */
  // [TownOfPolusGameOptionNames.MorphlingProbability]: NumberValue;
  // [TownOfPolusGameOptionNames.MorphlingCooldown]: NumberValue;

  /* Oracle */
  [TownOfPolusGameOptionNames.OracleProbability]: NumberValue;
  [TownOfPolusGameOptionNames.OracleCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.OracleAccuracy]: NumberValue;

  /* Phantom */
  [TownOfPolusGameOptionNames.PhantomProbability]: NumberValue;
  [TownOfPolusGameOptionNames.PhantomRemainingTasks]: NumberValue;
  [TownOfPolusGameOptionNames.PhantomAppearTime]: NumberValue;

  /* Serial Killer */
  [TownOfPolusGameOptionNames.SerialKillerProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SerialKillerCooldown]: NumberValue;

  /* Sheriff */
  [TownOfPolusGameOptionNames.SheriffProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SheriffCooldown]: NumberValue;

  /* Snitch */
  [TownOfPolusGameOptionNames.SnitchProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SnitchRemainingTasks]: NumberValue;
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
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.EngineerProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Grenadier,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.GrenadierProbability).getValue().value),
        assignWith: RoleAlignment.Impostor,
      }, {
        role: Jester,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.JesterProbability).getValue().value),
        assignWith: RoleAlignment.Neutral,
      // }, {
      //   role: Morphling,
      //   playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.MorphlingProbability).getValue().value),
      //   assignWith: RoleAlignment.Impostor,
      }, {
        role: Oracle,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.OracleProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Phantom,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.PhantomProbability).getValue().value),
        assignWith: RoleAlignment.Neutral,
      }, {
        role: SerialKiller,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerProbability).getValue().value),
        assignWith: RoleAlignment.Neutral,
      }, {
        role: Sheriff,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SheriffProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Snitch,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SnitchProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      },
    ];
  }

  async onEnable(lobby: LobbyInstance): Promise<void> {
    await super.onEnable(lobby);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    await Promise.all([
      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.EngineerProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      // engineer should not have a cooldown since it's a one time use button
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.EngineerCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.GrenadierProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierRange, new NumberValue(4, 0.5, 0.5, 10, false, "{0} units")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierBlindness, new NumberValue(5, 0.5, 0.5, 15, false, "{0}s")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.JesterProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),

      // gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.MorphlingProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.MorphlingCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.OracleProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleAccuracy, new NumberValue(50, 10, 0, 100, false, "{0}%")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.PhantomProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomAppearTime, new NumberValue(10, 5, 0, 60, false, "{0}s")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SerialKillerProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SerialKillerCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SheriffProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SheriffCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SnitchProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SnitchRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks")),
    ]);
  }

  async onDisable(lobby: LobbyInstance): Promise<void> {
    super.onDisable(lobby);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    await Promise.all(Object.values(TownOfPolusGameOptionNames).map(async option => await gameOptions.deleteOption(option)));
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
