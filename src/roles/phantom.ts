import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleAlignment, RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { Location, ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { shuffleArrayClone } from "@nodepolus/framework/src/util/shuffle";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Tasks } from "@nodepolus/framework/src/static";
import { SetStringPacket } from "@polusgg/plugin-polusgg-api/src/packets/root";

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

    this.owner.setTasks(new Set());

    this.catch("player.died", x => x.getPlayer()).execute(event => {
      this.owner.revive();

      this.transformed = true;

      this.owner.getSafeConnection().writeReliable(new SetStringPacket("Complete your tasks and call a meeting", Location.TaskText));

      Services.get(ServiceType.Animation).setOpacity(this.owner, 1);

      let tasks = Tasks.forLevel(event.getPlayer().getLobby().getLevel());

      tasks = shuffleArrayClone([...tasks]);
      tasks = tasks.slice(0, 4);

      event.getPlayer().setTasks(new Set(tasks));
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

    this.catch("player.task.completed", event => event.getPlayer()).execute(event => {
      if (this.transformed && event.getPlayer().getTasks().length < 1) {
        event.getPlayer().getLobby().getGame()!.getLobby().getPlayers()
          .forEach(player => {
            roleManager.setEndGameData(player.getSafeConnection(), {
              title: "Victory",
              subtitle: "",
              color: [255, 140, 238, 255],
              yourTeam: [this.owner],
            });
          });
        roleManager.endGame(event.getPlayer().getLobby().getGame()!);
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return PhantomManager;
  }

  getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    const impostors = player.getLobby().getPlayers().filter(players => players.isImpostor()).length;

    return {
      title: "Crewmate",
      subtitle: `There ${(impostors > 1 ? "are" : "is")} [FF1919FF]impostor${(impostors > 1 ? "s" : "")}[] among us`,
      color: [255, 140, 238, 255],
    };
  }
}
