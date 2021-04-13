import { StartGameScreenData } from "@polusgg/plugin-polusgg-api/src/services/roleManager/roleManagerService";
import { EdgeAlignments } from "@polusgg/plugin-polusgg-api/src/types/enums/edgeAlignment";
import { BaseManager } from "@polusgg/plugin-polusgg-api/src/baseManager/baseManager";
import { RoleMetadata } from "@polusgg/plugin-polusgg-api/src/baseRole/baseRole";
import { ServiceType } from "@polusgg/plugin-polusgg-api/src/types/enums";
import { shuffleArrayClone } from "@nodepolus/framework/src/util/shuffle";
import { PlayerInstance } from "@nodepolus/framework/src/api/player";
import { AssetBundle } from "@polusgg/plugin-polusgg-api/src/assets";
import { BaseRole } from "@polusgg/plugin-polusgg-api/src/baseRole";
import { Services } from "@polusgg/plugin-polusgg-api/src/services";
import { Vector2 } from "@nodepolus/framework/src/types";
import { Tasks } from "@nodepolus/framework/src/static";

export class PhantomManager extends BaseManager {
  getId(): string { return "phantom" }
  getTypeName(): string { return "Phantom" }
}

export class Phantom extends BaseRole {
  public died = false;

  protected metadata: RoleMetadata = {
    name: "Phantom",
  };

  constructor(owner: PlayerInstance) {
    super(owner);

    if (owner.getConnection() !== undefined) {
      Services.get(ServiceType.Resource).load(owner.getConnection()!, AssetBundle.loadSafeFromCache("TownOfPolus")).then(this.onReady);
    } else {
      this.onReady();
    }
  }

  onReady(): void {
    const roleManager = Services.get(ServiceType.RoleManager);

    this.owner.setTasks(new Set());

    Services.get(ServiceType.Button).spawnButton(this.owner.getSafeConnection(), {
      asset: AssetBundle.loadSafeFromCache("TownOfPolus").getSafeAsset("Assets/Mods/OfficialAssets/KillButton.png"),
      maxTimer: this.owner.getLobby().getOptions().getKillCooldown(),
      position: new Vector2(2.7, 0.7),
      alignment: EdgeAlignments.RightBottom,
    }).then(button => {
      this.catch("player.died", event => event.getPlayer()).execute(_ => button.getEntity().despawn());
    });

    this.catch("player.died", x => x.getPlayer()).execute(event => {
      this.owner.revive();

      Services.get(ServiceType.Animation).setOpacity(this.owner, 1);

      let tasks = Tasks.forLevel(event.getPlayer().getLobby().getLevel());

      tasks = shuffleArrayClone([...tasks]);
      tasks = tasks.slice(0, 4);

      event.getPlayer().setTasks(new Set(tasks));
    });

    this.catch("meeting.started", event => event.getCaller()).execute(event => {
      if (this.died) {
        event.getGame().getLobby().getPlayers()
          .forEach(player => {
            roleManager.setEndGameData(player.getSafeConnection(), {
              title: "Defeat",
              subtitle: "",
              color: [255, 140, 238, 255],
              yourTeam: [this.owner],
            });
          });
      }
    });
  }

  getManagerType(): typeof BaseManager {
    return PhantomManager;
  }

  getAssignmentScreen(player: PlayerInstance): StartGameScreenData {
    const impostors = player.getLobby().getPlayers().filter(x => x.isImpostor()).length;

    return {
      title: "Crewmate",
      subtitle: `There ${(impostors > 1 ? "are" : "is")} [FF1919FF]impostor${(impostors > 1 ? "s" : "")}[] among us`,
      color: [255, 140, 238, 255],
    };
  }
}
