import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { BaseRole, RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { Button } from "@polusgg/plugin-polusgg-api/src/services/buttonManager";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { Vector2 } from "@nodepolus/framework/src/types";
import { TownOfPolusGameOptions } from "../../index";
import { TownOfPolusGameOptionNames } from "../types";
import { GameState } from "@nodepolus/framework/src/types/enums";
import { Crewmate } from "@polusgg/plugin-polusgg-api/src/baseRole/crewmate/crewmate";
import { LobbyDefaultOptions } from "@polusgg/plugin-polusgg-api/src/services/gameOptions/gameOptionsService";
import { Student } from "./student";
import { Engineer } from "./engineer";
import { Locksmith } from "./locksmith";
import { Oracle } from "./oracle";
import { Snitch } from "./snitch";
import { Sheriff } from "./sheriff";

const COLOR = "#96b7cc";

export class MentorManager extends BaseManager {
  getId(): string { return "mentor" }
  getTypeName(): string { return "mentor" }
}

export enum MentorRange {
  "Short" = 1,
  "Medium" = 2,
  "Long" = 3,
}

/*const MENTOR_RANGE_BY_OPTION = new Map<string, number>([
  ["Short", 0.6],
  ["Normal", 1],
  ["Long", 2.5],
]);*/

export class Mentor extends Crewmate {
  protected metadata: RoleMetadata = {
    name: "Mentor",
    alignment: RoleAlignment.Crewmate,
    preventBaseEmoji: true,
  };

  private readonly mentorRange: number;
  private readonly mentorCooldown: number;
  private readonly numStudents: number;

  /*private readonly mentorMaxUses: number;
  private mentorCurrentUses: number;*/

  rolePool: typeof BaseRole[];

  targets: PlayerInstance[];
  crewmateTarget?: PlayerInstance;
  numLessons: number;

  teachButton!: Button;
  abilityButton?: Button;

  constructor(owner: PlayerInstance) {
    super(owner);
    
    const gameOptions = Services.get(ServiceType.GameOptions).getGameOptions<TownOfPolusGameOptions & LobbyDefaultOptions>(this.owner.getLobby());
    const totalTaskCount = gameOptions.getOption("Long Tasks").getValue().value + gameOptions.getOption("Short Tasks").getValue().value + gameOptions.getOption("Common Tasks").getValue().value;

    if (gameOptions.getOption(TownOfPolusGameOptionNames.StudentRoles).getValue().getSelected() === "All Roles") {
      this.rolePool = [ Engineer, Oracle, Sheriff ];

      if (this.owner.getLobby().getLevel() >= 2) {
        this.rolePool.push(Locksmith);
      }

      if (totalTaskCount >= 3) {
        this.rolePool.push(Snitch);
      }
    } else {
      this.rolePool = [];

      if (gameOptions.getOption(TownOfPolusGameOptionNames.StudentEngineerEnabled).getValue().value) {
        this.rolePool.push(Engineer);
      }

      if (gameOptions.getOption(TownOfPolusGameOptionNames.StudentSheriffEnabled).getValue().value && this.owner.getLobby().getLevel() >= 2) {
        this.rolePool.push(Locksmith);
      }

      if (gameOptions.getOption(TownOfPolusGameOptionNames.StudentLocksmithEnabled).getValue().value) {
        this.rolePool.push(Oracle);
      }

      if (gameOptions.getOption(TownOfPolusGameOptionNames.StudentOracleEnabled).getValue().value) {
        this.rolePool.push(Sheriff);
      }

      if (gameOptions.getOption(TownOfPolusGameOptionNames.StudentSnitchEnabled).getValue().value && totalTaskCount >= 3) {
        this.rolePool.push(Snitch);
      }
    }

    this.targets = [];
    this.numLessons = 0;

    this.mentorRange = MentorRange[gameOptions.getOption(TownOfPolusGameOptionNames.MentorRange).getValue().getSelected()];
    this.mentorCooldown = gameOptions.getOption(TownOfPolusGameOptionNames.MentorCooldown).getValue().value;
    this.numStudents = gameOptions.getOption(TownOfPolusGameOptionNames.MentorStudents).getValue().value;

    /*this.mentorMaxUses = 5;
    this.mentorCurrentUses = 0;*/

    this.onReady();
  }

  async onReady(): Promise<void> {
    const teachAsset = AssetBundle.loadSafeFromCache("TownOfPolus/TownOfPolus").getSafeAsset("Assets/Mods/TownOfPolus/Teach.png");
    this.teachButton = await Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
        alignment: EdgeAlignments.RightBottom,
        position: new Vector2(-2.1, -0.7),
        currentTime: 0,
        maxTimer: this.mentorCooldown,
        isCountingDown: false,
        saturated: false,
        asset: teachAsset
    });

    this.teachButton.setCurrentTime(this.teachButton.getMaxTime());

    this.assignTargets();
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());

    Services.get(ServiceType.CoroutineManager)
      .beginCoroutine(this.owner, this.coSaturateButton(this.owner, this.teachButton, player => player === this.getNextTarget()));

    this.teachButton.on("clicked", () => {
      if (this.teachButton.getCurrentTime() != 0 || !this.teachButton.isSaturated() || this.teachButton.isDestroyed()) {
        return;
      }
        
      const nextTarget = this.getNextTarget();

      const target = this.teachButton.getTargets(this.mentorRange)
        .filter(player => player === this.getNextTarget())[0];

      if (target !== nextTarget) {
        return;
      }

      this.numLessons++;

      if (this.numLessons >= this.targets.length) {
        Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getTaughtDescriptionText());
        this.teachButton.destroy();

        if (this.crewmateTarget) {
          const randomRole = this.rolePool[Math.floor(Math.random() * this.rolePool.length)];
          const student = Services.get(ServiceType.RoleManager).assignRole(this.crewmateTarget, Student, true) as Student;

          switch (randomRole) {
            case Engineer:
              student.giveEngineer();
              break;
            case Locksmith:
              student.giveLocksmith();
              break;
            case Oracle:
              student.giveOracle();
              break;
            case Sheriff:
              student.giveSheriff();
              break;
            case Snitch:
              student.giveSnitch();
              break;
          }
        }
      } else {
        Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());
      }

      this.teachButton.reset();
    });
  }

  *coSaturateButton(player: PlayerInstance, button: Button, targetSelector: (player: PlayerInstance) => boolean): Generator<void, void, number> {
    if (player.getLobby()
      .getGameState() !== GameState.Started) {
      yield;
    }

    const animService = Services.get(ServiceType.Animation);
    let outlined = false;
    let lastTarget: PlayerInstance | undefined;
    let wasInVent = false;

    while (true) {
      //todo break out on custom predicate
      if (player.isDead() || button.isDestroyed()) {
        const players = this.owner.getLobby()
          .getPlayers()
          .filter(x => x !== this.owner);

        for (let i = 0; i < players.length; i++) {
          animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
        }
        break;
      }

      const target = button.getTargets(this.mentorRange)
          .filter(targetSelector)[0];

      const isSaturated = button.isSaturated();

      if ((this.owner.getVent() === undefined) === wasInVent) {
        if (!wasInVent) {
          button.setSaturated(false);
        }

        if (!wasInVent) {
          const players = this.owner.getLobby()
            .getPlayers()
            .filter(x => x !== this.owner);

          for (let i = 0; i < players.length; i++) {
            animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
          }
        }

        wasInVent = (this.owner.getVent() !== undefined);

        while (this.owner.getVent() !== undefined) {
          if (player.isDead()) {
            break;
          }

          yield;
        }
        continue;
      }

      if ((target === undefined) === isSaturated) {
        button.setSaturated(!isSaturated);
      }

      if ((target === undefined) === outlined || lastTarget !== target) {
        const players = this.owner.getLobby()
          .getPlayers()
          .filter(x => x !== this.owner);

        for (let i = 0; i < players.length; i++) {
          if (players[i] === target) {
            animService.setOutline(players[i], [ 150, 183, 204, 255 ], [this.owner.getSafeConnection()]);
          } else {
            animService.clearOutlineFor(players[i], this.owner.getSafeConnection());
          }
        }

        lastTarget = target;
        outlined = !outlined;
      }
      yield;
    }
  }

  getNextTarget(): PlayerInstance|undefined {
    return this.targets[this.numLessons];
  }

  assignTargets() {
    this.crewmateTarget = this.owner.getLobby().getPlayers()
      .filter(player => player.getMeta<BaseRole|undefined>("pgg.api.role")?.getName() === "crewmate")[0];

    if (!this.crewmateTarget) {
      return;
    }

    const randomPlayers = this.owner.getLobby().getPlayers().filter(player => player !== this.crewmateTarget && player !== this.owner);

    for (let i = 0; i < this.numStudents - 1; i++) {
      const random = randomPlayers.splice(Math.floor(Math.random() * randomPlayers.length), 1);

      if (!random[0])
        break;

      this.targets.push(random[0]);
    }

    this.targets.splice(Math.floor(Math.random() * (randomPlayers.length + 1)), 0, this.crewmateTarget);
    
    Services.get(ServiceType.Hud).setHudString(this.owner, Location.TaskText, this.getDescriptionText());
  }

  getManagerType(): typeof BaseManager {
    return MentorManager;
  }

  getAssignmentScreen(_player: PlayerInstance, _impostorCount: number): StartGameScreenData {
    return {
        title: "Mentor",
        subtitle: "Teach the student",
        color: [ 150, 183, 204, 255 ]
    };
  }

  getDescriptionText(): string {
    if (!this.targets || this.targets.length === 0) {
      return `<color=${COLOR}>Role: Mentor
Finish your tasks, you have no students`;
    }

    const nextTarget = this.getNextTarget();

    if (nextTarget) {
      if (nextTarget.isDead()) {
        return `<color=${COLOR}>Role: Mentor
Finish your tasks, <color=#ff1919>Your student has died.</color>`;
      }

      const remaining = this.targets.length - this.numLessons;

      return `<color=${COLOR}>Role: Mentor
Finish your tasks and teach students.
Next student: ${nextTarget.getName()}
${remaining} lesson${remaining === 1 ? "" : "s"} remaining</color>`;
    }

    return `<color=${COLOR}>Role: Mentor
Finish your tasks and teach students.</color>`;
  }

  getTaughtDescriptionText(): string {
      return `<color=${COLOR}>Role: Mentor
Finish your tasks.</color>`
  }
}
