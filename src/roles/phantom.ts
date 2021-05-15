import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { shuffleArrayClone } from "@nodepolus/framework/src/util/shuffle";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Palette, Tasks } from "@nodepolus/framework/src/static";
import { SetStringPacket } from "@polusgg/plugin-polusgg-api/src/packets/root";
import { TownOfPolusGameOptions } from "../..";
import { TownOfPolusGameOptionNames } from "../types";

export class PhantomManager extends BaseManager {
  getId(): string { return "phantom" }
  getTypeName(): string { return "Phantom" }
}

export class Phantom extends BaseRole {
  public transformed = false;

  protected metadata: RoleMetadata = {
    name: "Phantom",
    alignment: RoleAlignment.Neutral,
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady.bind(this));
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const roleManager = Services.get(ServiceType.RoleManager);

    // this.catch("player.murdered", x => x.getPlayer()).execute(event => {
    //   // const notMurderer = event.getKiller().getLobby().getPlayers().filter(p => p !== event.getKiller());

    //   // for (let i = 0; i < notMurderer.length; i++) {

    //   // }
    // });

    this.catch("player.died", x => x.getPlayer()).execute(event => {
      event.cancel();

      this.owner.revive();
      this.transformed = true;
      this.owner.getSafeConnection().writeReliable(new SetStringPacket("Complete your tasks and call a meeting", Location.TaskText));
      Services.get(ServiceType.Animation).setOpacity(this.owner, 0.25);
      this.giveTasks();
    });

    this.catch("meeting.started", event => event.getCaller()).execute(event => {
      if (this.transformed) {
        event.getGame().getLobby().getPlayers()
          .forEach(player => {
            roleManager.setEndGameData(player.getSafeConnection(), {
              title: "Defeat",
              subtitle: "",
              color: [255, 140, 238, 255],
              yourTeam: [this.owner],
            });
          });
        roleManager.endGame(event.getGame());
      }
    });

    //make phantom not be able to report a body

    this.catch("meeting.started", event => event.getCaller())
      .where(event => this.transformed && event.getCaller().getTasks().filter(x => !x[1]).length < 1 && event.getVictim() === undefined)
      .execute(event => {
        event.getCaller().getLobby().getGame()!.getLobby().getPlayers()
          .forEach(player => {
            roleManager.setEndGameData(player.getSafeConnection(), {
              title: "Victory",
              subtitle: "",
              color: [255, 140, 238, 255],
              yourTeam: [this.owner],
            });
          });
        roleManager.endGame(event.getCaller().getLobby().getGame()!);
      });
  }

  giveTasks(): void {
    let tasks = Tasks.forLevel(this.owner.getLobby().getLevel());

    tasks = shuffleArrayClone([...tasks]);
    tasks = tasks.slice(0, Services.get(ServiceType.GameOptions)
      .getGameOptions<TownOfPolusGameOptions>(this.owner.getLobby()).getOption(TownOfPolusGameOptionNames.SnitchRemainingTasks)
      .getValue().value,
    );

    this.owner.setTasks(new Set(tasks));
  }

  getManagerType(): typeof BaseManager {
    return PhantomManager;
  }

  getAssignmentScreen(_player: PlayerInstance): StartGameScreenData {
  // getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    // const impostors = player.getLobby().getPlayers().filter(players => players.isImpostor()).length;

    return {
      title: "Phantom",
      // title: "Crewmate",
      subtitle: "Uncomment original intro when beta testing",
      // subtitle: `There ${(impostors > 1 ? "are" : "is")} <color=#FF1919FF>impostor${(impostors > 1 ? "s" : "")}</color> among us`,
      color: Palette.crewmateBlue(),
    };
  }
}
