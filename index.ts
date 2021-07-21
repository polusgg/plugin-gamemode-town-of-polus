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
  [TownOfPolusGameOptionNames.LocksmithCooldown]: NumberValue;
  [TownOfPolusGameOptionNames.LocksmithUses]: NumberValue;
  [TownOfPolusGameOptionNames.LocksmithRange]: EnumValue;
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        playerCount: this.resolveOptionPercent(gameOptions.getOption(TownOfPolusGameOptionNames.SnitchProbability)?.getValue()?.value ?? 0),
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

    gameOptions.on("option.Map.changed", this.handleLevelUpdate);

    gameOptions.on("option.Long Tasks.changed", this.handleTaskCountUpdate);
    gameOptions.on("option.Short Tasks.changed", this.handleTaskCountUpdate);
    gameOptions.on("option.Common Tasks.changed", this.handleTaskCountUpdate);

    await Promise.all([
      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.EngineerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.LocksmithProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 1),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithCooldown, new NumberValue(10, 5, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 2),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithUses, new NumberValue(2, 1, 1, 10, false, "{0} uses"), GameOptionPriority.Normal + 3),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.LocksmithRange, new EnumValue(1, ["Short", "Normal", "Long"]), GameOptionPriority.Normal + 4),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.OracleProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 5),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 6),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.OracleAccuracy, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 7),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SheriffProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 8),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SheriffCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 9),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SnitchProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 10),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SnitchRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks"), GameOptionPriority.Normal + 11),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.JesterProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 12),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.PhantomProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 13),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks"), GameOptionPriority.Normal + 14),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomAppearTime, new NumberValue(10, 5, 0, 60, false, "{0}s"), GameOptionPriority.Normal + 15),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.PhantomRevealTime, new EnumValue(0, ["Immediately", "After Meeting"]), GameOptionPriority.Normal + 16),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SerialKillerProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 17),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SerialKillerCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 18),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SerialKillerMinLobbySize, new NumberValue(6, 1, 4, 15, false, "{0} players"), GameOptionPriority.Normal + 19),

      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.GrenadierProbability, new NumberValue(0, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 20),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s"), GameOptionPriority.Normal + 21),
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierRange, new NumberValue(4, 0.5, 0.5, 10, false, "{0} units"), GameOptionPriority.Normal + 22),
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.GrenadierBlindness, new NumberValue(5, 0.5, 0.5, 15, false, "{0}s"), GameOptionPriority.Normal + 23),

      // gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.MorphlingProbability, new NumberValue(50, 10, 0, 100, false, "{0}%")),
      // gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.MorphlingCooldown, new NumberValue(10, 1, 10, 60, false, "{0}s")),


    ] as any[]);
  }

  async onDisable(lobby: LobbyInstance): Promise<void> {
    super.onDisable(lobby);

    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions>(lobby);

    await Promise.all(Object.values(TownOfPolusGameOptionNames).map(async option => await gameOptions.deleteOption(option)));
  }

  private handleTaskCountUpdate(opt: { getLobby(): LobbyInstance }): void {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & LobbyDefaultOptions & any>(opt.getLobby());

    const totalTaskCount = gameOptions.getOption("Long Tasks").getValue().value + gameOptions.getOption("Short Tasks").getValue().value + gameOptions.getOption("Common Tasks").getValue().value;

    if (totalTaskCount >= 3) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks) === undefined) {
        gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.SnitchProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 6);
        gameOptions.createOption(TownOfPolusGameOptionCategories.Config, TownOfPolusGameOptionNames.SnitchRemainingTasks, new NumberValue(2, 1, 0, 6, false, "{0} tasks"), GameOptionPriority.Normal + 7);
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (gameOptions.getOption("<color=#00ffdd7f>Snitch</color> <alpha=#7f>Remaining Tasks") !== undefined) {
        gameOptions.deleteOption("<color=#00ffdd7f>Snitch</color> <alpha=#7f>Remaining Tasks");
        gameOptions.deleteOption("<color=#00ffdd7f>Snitch</color> <color=#0b6e997f>[C]</color> <alpha=#7f>");
      }

      const snitchTaskCount = gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks);

      const nv = snitchTaskCount.getValue();

      nv.upper = totalTaskCount - 1;

      if (snitchTaskCount.getValue().value > totalTaskCount - 1) {
        nv.value = totalTaskCount - 1;
      }

      snitchTaskCount.setValue(nv);

      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (gameOptions.getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks) !== undefined) {
      gameOptions.deleteOption(TownOfPolusGameOptionNames.SnitchRemainingTasks);
      gameOptions.deleteOption(TownOfPolusGameOptionNames.SnitchProbability);
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (gameOptions.getOption("<color=#00ffdd7f>Snitch</color> <alpha=#7f>Remaining Tasks") === undefined) {
      gameOptions.createOption(TownOfPolusGameOptionCategories.Config, "<color=#00ffdd7f>Snitch</color> <alpha=#7f>Remaining Tasks", new EnumValue(0, ["Unavailable"]), GameOptionPriority.Normal + 7);
      gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, "<color=#00ffdd7f>Snitch</color> <color=#0b6e997f>[C]</color> <alpha=#7f>", new EnumValue(0, ["Unavailable"]), GameOptionPriority.Normal + 6);
    }
  }

  private async handleLevelUpdate(newLevel: GameOption<NumberValue | EnumValue | BooleanValue>): Promise<void> {
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & any>(newLevel.getLobby());

    if ((newLevel.getValue() as EnumValue).getSelected() === "Mira HQ") {
      await gameOptions.deleteOption(TownOfPolusGameOptionNames.LocksmithProbability);
      await gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, `<color=#3d85c67f>Locksmith</color> <color=#0b6e997f>[C]</color><alpha=#7f>`, new EnumValue(0, ["Unavailable"]), GameOptionPriority.Normal + 8);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (gameOptions.getOption(`<color=#3d85c67f>Locksmith</color> <color=#0b6e997f>[C]</color><alpha=#7f>`) !== undefined) {
      await gameOptions.deleteOption(`<color=#3d85c67f>Locksmith</color> <color=#0b6e997f>[C]</color><alpha=#7f>`);
      await gameOptions.createOption(TownOfPolusGameOptionCategories.Roles, TownOfPolusGameOptionNames.LocksmithProbability, new NumberValue(50, 10, 0, 100, false, "{0}%"), GameOptionPriority.Normal + 8);
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
