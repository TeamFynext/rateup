import { IconChevronDown } from "@tabler/icons-react";
import {
  Menu,
  ActionIcon,
} from "@mantine/core";
import { RateupButtonPrimary } from "../../Button/RateupButtons";

export function StatusFilterMenu({ filterParam, setFilterParam }){
  return (
  <Menu shadow="md" width={80}  >
         <Menu.Target>
              <ActionIcon mr="lg" pt="7px" mt="0px"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                 <RateupButtonPrimary
                    title={"Status"}
                    variant="subtle"
                    rightIcon={<IconChevronDown size="1rem" />}
                  />
              </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
              <Menu.Item  
                color={filterParam === 'all' && 'blue'}
                onClick={() => setFilterParam('all')}>All</Menu.Item>
              
              <Menu.Item 
                color={filterParam === 'active' && 'blue'}
                onClick={() => setFilterParam('active')}>Active</Menu.Item>
              
              <Menu.Item 
                 color={filterParam === 'paused' && 'blue'}
                onClick={() => setFilterParam('paused')}>Paused</Menu.Item>
                
         </Menu.Dropdown>

</Menu>)
}