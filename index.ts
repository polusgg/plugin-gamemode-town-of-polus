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
// import { Morphling } from "./src/roles/morphling";
import { Oracle } from "./src/roles/oracle";
import { Phantom } from "./src/roles/phantom";
import { SerialKiller } from "./src/roles/serialKiller";
import { BooleanValue, EnumValue, NumberValue } from "@polusgg/plugin-polusgg-api/src/packets/root/setGameOption";
import { RoleAlignment } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { TownOfPolusGameOptionCategories, TownOfPolusGameOptionNames } from "./src/types";
import { GameOptionPriority } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOptionsSet";
import { Locksmith } from "./src/roles/locksmith";
import { LobbyDefaultOptions } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOptionsService";
import { GameOption } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOption";
import { Level } from "@nodepolus/framework/src/types/enums";

export type TownOfPolusGameOptions = {
  /* Engineer */
  [TownOfPolusGameOptionNames.EngineerProbability]: NumberValue;

  /* Grenadier */
  [TownOfPolusGameOptionNames.GrenadierProbability]: NumberValue;
  [TownOfPolusGameOptionNames.GrenadierCooldown]: NumberValue;
  // [TownOfPolusGameOptionNames.GrenadierRange]: NumberValue;
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
  [TownOfPolusGameOptionNames.PhantomRevealTime]: EnumValue;

  /* Serial Killer */
  [TownOfPolusGameOptionNames.SerialKillerProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SerialKillerCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.SerialKillerMinLobbySize]: NumberValue;

  /* Sheriff */
  [TownOfPolusGameOptionNames.SheriffProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SheriffCooldown]: NumberValue;

  /* Snitch */
  [TownOfPolusGameOptionNames.SnitchProbability]: NumberValue;
  [TownOfPolusGameOptionNames.SnitchRemainingTasks]: NumberValue;

  /* Locksmith */
  [TownOfPolusGameOptionNames.LocksmithProbability]: NumberValue;
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
        playerCount: gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerMinLobbySize).getValue().value <= lobby.getPlayers().length ? this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SerialKillerProbability).getValue().value) : 0,
        assignWith: RoleAlignment.Neutral,
      }, {
        role: Sheriff,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SheriffProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Snitch,
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SnitchProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      }, {
        role: Locksmith,
        playerCount: lobby.getLevel() === Level.MiraHq ? 0 : this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.LocksmithProbability).getValue().value),
        assignWith: RoleAlignment.Crewmate,
      },
    ];
  }

  async onEnable(lobby: LobbyInstance): Promise<void> {
    await super.onEnable(lobby);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & LobbyDefaultOptions>(lobby);

    gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRevealTime, new EnumValue(0, ["A", "B"]));

    await Promise.all([
      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.EngineerProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.OracleProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 1),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 2),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleAccuracy, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 3),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SheriffProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 4),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SheriffCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 5),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SnitchProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 6),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SnitchRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks"), GameOptionPriority.Normal + 7),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.JesterProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 8),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.PhantomProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 9),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks"), GameOptionPriority.Normal + 10),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomAppearTime, new NumberValue(10, 5, 0, 60, false, "{0}s"), GameOptionPriority.Normal + 11),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRevealTime, new EnumValue(0, ["Immediately", "After Meeting"]), GameOptionPriority.Normal + 12),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SerialKillerProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 13),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SerialKillerCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 14),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SerialKillerMinLobbySize, new NumberValue(6, 1, 4, 15, false, "{0} players"), GameOptionPriority.Normal + 15),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.GrenadierProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 16),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 17),
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierRange, new NumberValue(4, 0.5, 0.5, 10, false, "{0} units"), GameOptionPriority.Normal + 18),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierBlindness, new NumberValue(5, 0.5, 0.5, 15, false, "{0}s"), GameOptionPriority.Normal + 19),

      // gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.MorphlingProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.MorphlingCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.LocksmithProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 20),
    ] as any[]);

    gameOptions.on("option.Map.changed", this.handleLevelUpdate);
  }

  async onDisable(lobby: LobbyInstance): Promise<void> {
    super.onDisable(lobby);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    await Promise.all(Object.values(TownOfPolusGameOptionNames).map(async option => await gameOptions.deleteOption(option)));
  }

  private async handleLevelUpdate(newLevel: GameOption<NumberValue | EnumValue | BooleanValue>): Promise<void> {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(newLevel.getLobby());

    if ((newLevel.getValue() as EnumValue).getSelected() === "Mira HQ") {
      await gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithProbability);
    } else {
      await gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.LocksmithProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 20);
    }
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
